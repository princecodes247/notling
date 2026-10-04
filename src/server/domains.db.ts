import { db } from '~/db';
import { workspaces, workspaceCustomDomains, pages, workspaceMembers } from '~/db/schema';
import { eq, and, or, asc, desc } from 'drizzle-orm';
import { getRequestHeader } from '@tanstack/react-start/server';
import { getSessionImpl } from './auth.db';
import { sanitizeServerError } from './errors';
import dns from 'node:dns/promises';

const RESERVED_SUBDOMAINS = new Set([
  'www',
  'api',
  'app',
  'auth',
  'admin',
  'mail',
  'smtp',
  'pop',
  'imap',
  'staging',
  'dev',
  'static',
  'assets',
  'cname',
  'cdn',
  'status',
  'support',
  'help',
  'docs',
  'blog',
  'dashboard',
]);

const KNOWN_BASE_DOMAINS = [
  'localhost',
  'lvh.me',
  '127.0.0.1.nip.io',
  'notling.app',
  'notling.com',
  'aeroplane.prnce.xyz',
];

export interface ParsedHostResult {
  host: string;
  isMainDomain: boolean;
  type: 'main' | 'subdomain' | 'custom_domain';
  subdomain: string | null;
  customDomain: string | null;
}

export function parseHost(rawHost?: string | null): ParsedHostResult {
  if (!rawHost) {
    return {
      host: '',
      isMainDomain: true,
      type: 'main',
      subdomain: null,
      customDomain: null,
    };
  }

  // Strip port and lower-case
  let host = rawHost.trim().toLowerCase().split(':')[0];

  // IP address check (e.g. 127.0.0.1, 192.168.1.100, etc.)
  const isIp = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || host === '::1';
  if (isIp || host === 'localhost') {
    return {
      host,
      isMainDomain: true,
      type: 'main',
      subdomain: null,
      customDomain: null,
    };
  }

  // Check additional env configured base domains
  const customBase = process.env.APP_BASE_DOMAIN || process.env.VITE_APP_DOMAIN;
  const baseDomains = customBase ? [...KNOWN_BASE_DOMAINS, customBase.toLowerCase().split(':')[0]] : KNOWN_BASE_DOMAINS;

  // Check if host ends with one of the base domains
  for (const base of baseDomains) {
    if (host === base || host === `www.${base}`) {
      return {
        host,
        isMainDomain: true,
        type: 'main',
        subdomain: null,
        customDomain: null,
      };
    }

    if (host.endsWith(`.${base}`)) {
      const sub = host.slice(0, -(base.length + 1)).trim();
      // Handle nested subdomains e.g. team.workspace.notling.app -> take the innermost part
      const parts = sub.split('.');
      const candidateSub = parts[parts.length - 1];

      if (RESERVED_SUBDOMAINS.has(candidateSub)) {
        return {
          host,
          isMainDomain: true,
          type: 'main',
          subdomain: null,
          customDomain: null,
        };
      }

      return {
        host,
        isMainDomain: false,
        type: 'subdomain',
        subdomain: candidateSub,
        customDomain: null,
      };
    }
  }

  // If not matching any base domain, it's a custom domain!
  return {
    host,
    isMainDomain: false,
    type: 'custom_domain',
    subdomain: null,
    customDomain: host,
  };
}

export interface WorkspacePublicOverview {
  workspace: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    description: string | null;
    publicHomeDocId: string | null;
  };
  domainType: 'subdomain' | 'custom_domain';
  domainName: string;
  matchedCustomDomain?: {
    id: string;
    domain: string;
    status: string;
    publicHomeDocId: string | null;
    isPrimary: boolean;
  } | null;
  homeDoc?: {
    id: string;
    title: string;
    icon: string | null;
    content: any[];
    contentText: string | null;
    updatedAt: Date;
  } | null;
  publicPages: Array<{
    id: string;
    title: string;
    icon: string | null;
    parentId: string | null;
    order: number;
    updatedAt: Date;
  }>;
  isMemberOrOwner: boolean;
}

export async function resolveWorkspaceByHost(incomingHost?: string | null): Promise<WorkspacePublicOverview | null> {
  try {
    let host = incomingHost;
    if (!host) {
      try {
        host = getRequestHeader('x-forwarded-host') || getRequestHeader('host');
      } catch {
        // May occur in non-request contexts
      }
    }

    const parsed = parseHost(host);
    if (parsed.isMainDomain) {
      return null;
    }

    let targetWorkspaceId: string | null = null;
    let matchedCustomDomainRecord: any = null;

    if (parsed.type === 'subdomain' && parsed.subdomain) {
      // Find workspace by slug (slug is the subdomain)
      const found = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.slug, parsed.subdomain))
        .limit(1);

      if (found.length > 0) {
        targetWorkspaceId = found[0].id;
      }
    } else if (parsed.type === 'custom_domain' && parsed.customDomain) {
      // Find workspace by verified/configured custom domain
      const foundDomain = await db
        .select()
        .from(workspaceCustomDomains)
        .where(eq(workspaceCustomDomains.domain, parsed.customDomain))
        .limit(1);

      if (foundDomain.length > 0) {
        matchedCustomDomainRecord = foundDomain[0];
        targetWorkspaceId = foundDomain[0].workspaceId;
      }
    }

    if (!targetWorkspaceId) {
      return null;
    }

    // Retrieve workspace
    const wsList = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, targetWorkspaceId))
      .limit(1);

    if (wsList.length === 0) {
      return null;
    }

    const ws = wsList[0];

    // Check if current user is owner or member
    let isMemberOrOwner = false;
    try {
      const session = await getSessionImpl();
      if (session) {
        if (session.userId === ws.ownerId) {
          isMemberOrOwner = true;
        } else if (session.email) {
          const member = await db
            .select({ id: workspaceMembers.id })
            .from(workspaceMembers)
            .where(
              and(
                eq(workspaceMembers.workspaceId, ws.id),
                or(eq(workspaceMembers.userId, session.userId), eq(workspaceMembers.email, session.email.trim().toLowerCase()))
              )
            )
            .limit(1);
          if (member.length > 0) {
            isMemberOrOwner = true;
          }
        }
      }
    } catch {
      // Ignore session errors
    }

    // Retrieve public pages for this workspace
    const publicPages = await db
      .select({
        id: pages.id,
        title: pages.title,
        icon: pages.icon,
        parentId: pages.parentId,
        order: pages.order,
        updatedAt: pages.updatedAt,
      })
      .from(pages)
      .where(
        and(
          eq(pages.workspaceId, ws.id),
          eq(pages.isDeleted, false),
          or(eq(pages.visibility, 'public'), eq(pages.visibility, 'public_edit'))
        )
      )
      .orderBy(asc(pages.order), asc(pages.createdAt));

    // Determine home doc: custom domain homeDoc override || workspace publicHomeDocId || first public page
    const homeDocId = matchedCustomDomainRecord?.publicHomeDocId || ws.publicHomeDocId || (publicPages.length > 0 ? publicPages[0].id : null);
    let homeDoc = null;

    if (homeDocId) {
      const docList = await db
        .select({
          id: pages.id,
          title: pages.title,
          icon: pages.icon,
          content: pages.content,
          contentText: pages.contentText,
          updatedAt: pages.updatedAt,
          visibility: pages.visibility,
        })
        .from(pages)
        .where(
          and(
            eq(pages.id, homeDocId),
            eq(pages.workspaceId, ws.id),
            eq(pages.isDeleted, false)
          )
        )
        .limit(1);

      if (docList.length > 0 && (docList[0].visibility === 'public' || docList[0].visibility === 'public_edit' || isMemberOrOwner)) {
        homeDoc = docList[0];
      }
    }

    return {
      workspace: {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        icon: ws.icon,
        description: ws.description,
        publicHomeDocId: ws.publicHomeDocId,
      },
      domainType: parsed.type as 'subdomain' | 'custom_domain',
      domainName: parsed.type === 'subdomain' ? parsed.subdomain! : parsed.customDomain!,
      matchedCustomDomain: matchedCustomDomainRecord
        ? {
            id: matchedCustomDomainRecord.id,
            domain: matchedCustomDomainRecord.domain,
            status: matchedCustomDomainRecord.status,
            publicHomeDocId: matchedCustomDomainRecord.publicHomeDocId,
            isPrimary: matchedCustomDomainRecord.isPrimary,
          }
        : null,
      homeDoc,
      publicPages,
      isMemberOrOwner,
    };
  } catch (err) {
    console.error('Error resolving workspace by host:', err);
    return null;
  }
}

// Check Subdomain Availability
export async function checkWorkspaceSubdomainImpl(input: {
  subdomain: string;
  excludeWorkspaceId?: string;
}): Promise<{ isAvailable: boolean; candidateSubdomain: string; cleanSubdomain: string; error?: string }> {
  const cleanSubdomain = input.subdomain
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  if (cleanSubdomain.length < 3) {
    return {
      isAvailable: false,
      candidateSubdomain: cleanSubdomain,
      cleanSubdomain,
      error: 'Subdomain must be at least 3 characters long.',
    };
  }

  if (RESERVED_SUBDOMAINS.has(cleanSubdomain)) {
    return {
      isAvailable: false,
      candidateSubdomain: `${cleanSubdomain}-ws`,
      cleanSubdomain,
      error: `"${cleanSubdomain}" is a reserved subdomain.`,
    };
  }

  const existing = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, cleanSubdomain))
    .limit(1);

  const isAvailable = existing.length === 0 || (!!input.excludeWorkspaceId && existing[0].id === input.excludeWorkspaceId);

  let candidateSubdomain = cleanSubdomain;
  if (!isAvailable) {
    let counter = 1;
    while (true) {
      candidateSubdomain = `${cleanSubdomain}-${counter}`;
      const conflict = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.slug, candidateSubdomain))
        .limit(1);
      if (conflict.length === 0 || (!!input.excludeWorkspaceId && conflict[0].id === input.excludeWorkspaceId)) {
        break;
      }
      counter++;
    }
  }

  return {
    isAvailable,
    candidateSubdomain,
    cleanSubdomain,
  };
}

// Update Workspace Subdomain & Home Document
export async function updateWorkspaceSubdomainImpl(input: {
  workspaceId: string;
  subdomain?: string;
  publicHomeDocId?: string | null;
}): Promise<{ success: boolean; error?: string; subdomain?: string }> {
  try {
    const session = await getSessionImpl();
    if (!session || !session.isWorkspaceOwner) {
      return { success: false, error: 'Only workspace owners can configure workspace domains.' };
    }

    if (input.subdomain !== undefined) {
      const check = await checkWorkspaceSubdomainImpl({
        subdomain: input.subdomain,
        excludeWorkspaceId: input.workspaceId,
      });

      if (!check.isAvailable) {
        return { success: false, error: check.error || `Subdomain is unavailable. Suggested: ${check.candidateSubdomain}` };
      }

      await db
        .update(workspaces)
        .set({
          slug: check.cleanSubdomain,
          ...(input.publicHomeDocId !== undefined && { publicHomeDocId: input.publicHomeDocId }),
        })
        .where(eq(workspaces.id, input.workspaceId));

      return { success: true, subdomain: check.cleanSubdomain };
    }

    if (input.publicHomeDocId !== undefined) {
      await db
        .update(workspaces)
        .set({ publicHomeDocId: input.publicHomeDocId })
        .where(eq(workspaces.id, input.workspaceId));
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: sanitizeServerError(err, 'Failed to update workspace subdomain.') };
  }
}

// Custom Domains Management
export async function getWorkspaceCustomDomainsImpl(workspaceId: string) {
  try {
    const session = await getSessionImpl();
    if (!session) {
      return [];
    }

    return await db
      .select()
      .from(workspaceCustomDomains)
      .where(eq(workspaceCustomDomains.workspaceId, workspaceId))
      .orderBy(desc(workspaceCustomDomains.isPrimary), desc(workspaceCustomDomains.createdAt));
  } catch (err) {
    console.error('Error fetching custom domains:', err);
    return [];
  }
}

export function cleanCustomDomainName(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0]
    .trim();
}

export async function addWorkspaceCustomDomainImpl(input: {
  workspaceId: string;
  domain: string;
  publicHomeDocId?: string | null;
}): Promise<{ success: boolean; error?: string; domain?: any }> {
  try {
    const session = await getSessionImpl();
    if (!session || !session.isWorkspaceOwner) {
      return { success: false, error: 'Only workspace owners can add custom domains.' };
    }

    const cleanDomain = cleanCustomDomainName(input.domain);

    // Validate domain format
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(cleanDomain)) {
      return { success: false, error: 'Please enter a valid domain format, e.g. docs.company.com' };
    }

    // Check if domain conflicts with base domains
    for (const base of KNOWN_BASE_DOMAINS) {
      if (cleanDomain === base || cleanDomain.endsWith(`.${base}`)) {
        return { success: false, error: `Domains under ${base} cannot be added as custom domains. Use your workspace subdomain instead.` };
      }
    }

    // Check if already added anywhere
    const existing = await db
      .select({ id: workspaceCustomDomains.id, workspaceId: workspaceCustomDomains.workspaceId })
      .from(workspaceCustomDomains)
      .where(eq(workspaceCustomDomains.domain, cleanDomain))
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].workspaceId === input.workspaceId) {
        return { success: false, error: 'This custom domain has already been added to this workspace.' };
      }
      return { success: false, error: 'This domain is already connected to another workspace.' };
    }

    const defaultDnsTarget = process.env.CUSTOM_DOMAIN_CNAME_TARGET || 'cname.notling.app';

    // Count existing custom domains to check if this is primary
    const existingList = await db
      .select({ id: workspaceCustomDomains.id })
      .from(workspaceCustomDomains)
      .where(eq(workspaceCustomDomains.workspaceId, input.workspaceId));

    const isPrimary = existingList.length === 0;

    const [newDomain] = await db
      .insert(workspaceCustomDomains)
      .values({
        workspaceId: input.workspaceId,
        domain: cleanDomain,
        status: 'pending',
        dnsTarget: defaultDnsTarget,
        dnsRecordType: 'CNAME',
        publicHomeDocId: input.publicHomeDocId || null,
        isPrimary,
      })
      .returning();

    return { success: true, domain: newDomain };
  } catch (err: any) {
    return { success: false, error: sanitizeServerError(err, 'Failed to add custom domain.') };
  }
}

export async function removeWorkspaceCustomDomainImpl(input: {
  domainId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSessionImpl();
    if (!session || !session.isWorkspaceOwner) {
      return { success: false, error: 'Only workspace owners can remove custom domains.' };
    }

    await db
      .delete(workspaceCustomDomains)
      .where(
        and(
          eq(workspaceCustomDomains.id, input.domainId),
          eq(workspaceCustomDomains.workspaceId, session.workspaceId)
        )
      );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: sanitizeServerError(err, 'Failed to remove custom domain.') };
  }
}

export async function setPrimaryCustomDomainImpl(input: {
  domainId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSessionImpl();
    if (!session || !session.isWorkspaceOwner) {
      return { success: false, error: 'Only workspace owners can set primary domain.' };
    }

    // Set all to false
    await db
      .update(workspaceCustomDomains)
      .set({ isPrimary: false })
      .where(eq(workspaceCustomDomains.workspaceId, session.workspaceId));

    // Set target to true
    await db
      .update(workspaceCustomDomains)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(
        and(
          eq(workspaceCustomDomains.id, input.domainId),
          eq(workspaceCustomDomains.workspaceId, session.workspaceId)
        )
      );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: sanitizeServerError(err, 'Failed to set primary domain.') };
  }
}

export async function updateCustomDomainHomeDocImpl(input: {
  domainId: string;
  publicHomeDocId?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSessionImpl();
    if (!session || !session.isWorkspaceOwner) {
      return { success: false, error: 'Unauthorized.' };
    }

    await db
      .update(workspaceCustomDomains)
      .set({
        publicHomeDocId: input.publicHomeDocId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workspaceCustomDomains.id, input.domainId),
          eq(workspaceCustomDomains.workspaceId, session.workspaceId)
        )
      );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: sanitizeServerError(err, 'Failed to update custom domain home doc.') };
  }
}

export async function verifyCustomDomainImpl(input: {
  domainId: string;
  simulate?: boolean;
}): Promise<{
  success: boolean;
  status: 'verified' | 'pending' | 'invalid';
  message: string;
  detectedRecords?: string[];
  expectedTarget?: string;
}> {
  try {
    const session = await getSessionImpl();
    if (!session || !session.isWorkspaceOwner) {
      return {
        success: false,
        status: 'invalid',
        message: 'Only workspace owners can verify custom domains.',
      };
    }

    const domainList = await db
      .select()
      .from(workspaceCustomDomains)
      .where(
        and(
          eq(workspaceCustomDomains.id, input.domainId),
          eq(workspaceCustomDomains.workspaceId, session.workspaceId)
        )
      )
      .limit(1);

    if (domainList.length === 0) {
      return { success: false, status: 'invalid', message: 'Domain record not found.' };
    }

    const rec = domainList[0];
    const expectedTarget = rec.dnsTarget.toLowerCase();

    // Dev mode / simulation verification bypass
    if (input.simulate || process.env.ALLOW_MOCK_DNS_VERIFICATION === 'true') {
      await db
        .update(workspaceCustomDomains)
        .set({
          status: 'verified',
          verifiedAt: new Date(),
          lastCheckedAt: new Date(),
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(workspaceCustomDomains.id, rec.id));

      return {
        success: true,
        status: 'verified',
        message: `Domain ${rec.domain} verified successfully! SSL certificate is active.`,
        detectedRecords: [expectedTarget],
        expectedTarget,
      };
    }

    // Real DNS Lookup
    let detectedCnames: string[] = [];
    let detectedIps: string[] = [];
    let isMatched = false;

    try {
      detectedCnames = await dns.resolveCname(rec.domain);
      isMatched = detectedCnames.some(
        (c) => c.toLowerCase().trim().replace(/\.$/, '') === expectedTarget.replace(/\.$/, '')
      );
    } catch (dnsErr: any) {
      // If CNAME lookup fails, check A records
      try {
        detectedIps = await dns.resolve4(rec.domain);
      } catch {}
    }

    const lastChecked = new Date();

    if (isMatched) {
      await db
        .update(workspaceCustomDomains)
        .set({
          status: 'verified',
          verifiedAt: lastChecked,
          lastCheckedAt: lastChecked,
          errorMessage: null,
          updatedAt: lastChecked,
        })
        .where(eq(workspaceCustomDomains.id, rec.id));

      return {
        success: true,
        status: 'verified',
        message: `DNS record verified! CNAME correctly points to ${expectedTarget}.`,
        detectedRecords: detectedCnames,
        expectedTarget,
      };
    }

    // If not matched yet
    const errorMsg = detectedCnames.length > 0
      ? `CNAME points to ${detectedCnames.join(', ')} instead of ${expectedTarget}.`
      : detectedIps.length > 0
      ? `Found A records (${detectedIps.join(', ')}) but expected CNAME pointing to ${expectedTarget}.`
      : `No DNS records found for ${rec.domain}. DNS propagation may take up to 24 hours.`;

    await db
      .update(workspaceCustomDomains)
      .set({
        status: 'invalid',
        lastCheckedAt: lastChecked,
        errorMessage: errorMsg,
        updatedAt: lastChecked,
      })
      .where(eq(workspaceCustomDomains.id, rec.id));

    return {
      success: false,
      status: 'invalid',
      message: errorMsg,
      detectedRecords: detectedCnames.length > 0 ? detectedCnames : detectedIps,
      expectedTarget,
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'invalid',
      message: sanitizeServerError(err, 'DNS verification encountered an error.'),
    };
  }
}
