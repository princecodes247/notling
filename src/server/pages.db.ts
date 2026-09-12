import { db } from '~/db';
import { pages, workspaces, pageShares, pagePresence, users, workspaceMembers } from '~/db/schema';
import { eq, and, desc, asc, isNull, lt, ne } from 'drizzle-orm';
import type { PageTreeNode } from './pages';
import { getSessionImpl } from './auth.db';


async function resolveWorkspaceId(providedWorkspaceId?: string): Promise<string | null> {
  if (providedWorkspaceId) {
    try {
      const existing = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.id, providedWorkspaceId))
        .limit(1);
      if (existing.length > 0) {
        return existing[0].id;
      }
    } catch {
      // Invalid UUID or missing
    }
  }
  return null;
}

export async function fetchPageTree(workspaceId: string): Promise<PageTreeNode[]> {
  try {
    const targetWorkspaceId = await resolveWorkspaceId(workspaceId);
    if (!targetWorkspaceId) return [];

    const session = await getSessionImpl();

    const allPages = await db
      .select({
        id: pages.id,
        workspaceId: pages.workspaceId,
        parentId: pages.parentId,
        title: pages.title,
        icon: pages.icon,
        visibility: pages.visibility,
        order: pages.order,
        createdAt: pages.createdAt,
        updatedAt: pages.updatedAt,
        contentText: pages.contentText,
      })
      .from(pages)
      .where(and(eq(pages.workspaceId, targetWorkspaceId), eq(pages.isDeleted, false)))
      .orderBy(asc(pages.order), asc(pages.createdAt));

    const visiblePages = allPages.filter((page) => {
      if (session && session.workspaceId === page.workspaceId) {
        return true;
      }
      return page.visibility === 'public';
    });

    const pageMap = new Map<string, PageTreeNode>();
    const rootNodes: PageTreeNode[] = [];

    for (const page of visiblePages) {
      pageMap.set(page.id, { ...page, children: [] });
    }

    for (const page of visiblePages) {
      const node = pageMap.get(page.id)!;
      if (page.parentId && pageMap.has(page.parentId)) {
        pageMap.get(page.parentId)!.children.push(node);
      } else {
        rootNodes.push(node);
      }
    }

    if (session?.email) {
      const cleanEmail = session.email.trim().toLowerCase();
      const sharedList = await db
        .select({
          id: pages.id,
          workspaceId: pages.workspaceId,
          parentId: pages.parentId,
          title: pages.title,
          icon: pages.icon,
          visibility: pages.visibility,
          order: pages.order,
          createdAt: pages.createdAt,
          updatedAt: pages.updatedAt,
          contentText: pages.contentText,
        })
        .from(pageShares)
        .innerJoin(pages, eq(pageShares.pageId, pages.id))
        .where(and(eq(pageShares.email, cleanEmail), eq(pages.isDeleted, false)));

      for (const sp of sharedList) {
        if (!pageMap.has(sp.id)) {
          const node: PageTreeNode = { ...sp, children: [], isShared: true };
          pageMap.set(sp.id, node);
          rootNodes.push(node);
        }
      }
    }

    return rootNodes;
  } catch (err) {
    console.error('Error fetching page tree:', err);
    return [];
  }
}

export async function fetchPage(pageId: string) {
  try {
    const pageList = await db.select().from(pages).where(and(eq(pages.id, pageId), eq(pages.isDeleted, false))).limit(1);
    if (pageList.length === 0) return null;
    const page = pageList[0];

    const session = await getSessionImpl();
    const userEmail = session?.email ? session.email.trim().toLowerCase() : null;
    const canEdit = await checkCanUserEditPage(pageId);

    if (session && session.workspaceId === page.workspaceId) {
      return { ...page, canEdit };
    }

    if (userEmail) {
      const shares = await db
        .select()
        .from(pageShares)
        .where(and(eq(pageShares.pageId, pageId), eq(pageShares.email, userEmail)))
        .limit(1);

      if (shares.length > 0) {
        return { ...page, canEdit };
      }
    }

    if (page.visibility === 'public' || page.visibility === 'public_edit') {
      return { ...page, canEdit };
    }

    return null;
  } catch (err) {
    console.error('Error fetching page:', err);
    return null;
  }
}

export interface ActiveUserPresence {
  id: string;
  email: string;
  name: string | null;
  role: 'viewer' | 'editor';
  lastPing: Date;
  clientId?: string;
}

export interface SharedPageData {
  page: typeof pages.$inferSelect;
  accessLevel: 'editor' | 'viewer';
  isLoggedIn: boolean;
  userEmail: string | null;
  isWorkspaceMember: boolean;
  activeUsers: ActiveUserPresence[];
}

export async function fetchActivePresence(pageId: string): Promise<ActiveUserPresence[]> {
  try {
    // Delete stale presence older than 6 seconds (ping interval is 3s)
    const threshold = new Date(Date.now() - 6 * 1000);
    await db.delete(pagePresence).where(lt(pagePresence.lastPing, threshold));

    const list = await db
      .select({
        id: pagePresence.id,
        email: pagePresence.email,
        name: pagePresence.name,
        role: pagePresence.role,
        lastPing: pagePresence.lastPing,
      })
      .from(pagePresence)
      .where(eq(pagePresence.pageId, pageId))
      .orderBy(asc(pagePresence.email), asc(pagePresence.id));

    const seen = new Set<string>();
    const result: ActiveUserPresence[] = [];

    for (const item of list) {
      const [baseEmail, clientTag] = item.email.split('#');
      const cleanKey = baseEmail.trim().toLowerCase();
      if (cleanKey && !seen.has(cleanKey)) {
        seen.add(cleanKey);
        result.push({
          ...item,
          email: baseEmail,
          clientId: clientTag || item.id,
        });
      }
    }

    return result;
  } catch (err) {
    console.error('Error fetching active presence:', err);
    return [];
  }
}

export async function removePagePresence(input: { pageId: string; clientId?: string }) {
  try {
    let session = null;
    try {
      session = await getSessionImpl();
    } catch {}

    const cid = input.clientId || 'default';
    const cleanEmail = session?.email
      ? `${session.email.trim().toLowerCase()}#${cid}`
      : `guest-${cid}@notling.app`;

    await db
      .delete(pagePresence)
      .where(and(eq(pagePresence.pageId, input.pageId), eq(pagePresence.email, cleanEmail)));

    return { success: true };
  } catch (err) {
    console.error('Error removing presence:', err);
    return { success: false };
  }
}

export async function recordPagePresence(input: {
  pageId: string;
  role: 'viewer' | 'editor';
  clientId?: string;
  guestName?: string;
}) {
  try {
    let session = null;
    try {
      session = await getSessionImpl();
    } catch {}

    const cid = input.clientId || 'default';
    const cleanEmail = session?.email
      ? `${session.email.trim().toLowerCase()}#${cid}`
      : `guest-${cid}@notling.app`;
    const cleanName =
      session?.name ||
      input.guestName ||
      (session?.email ? session.email.split('@')[0] : `Guest ${cid.slice(-4)}`);

    // Clean stale presence older than 6 seconds
    const threshold = new Date(Date.now() - 6 * 1000);
    await db.delete(pagePresence).where(lt(pagePresence.lastPing, threshold));

    const existing = await db
      .select()
      .from(pagePresence)
      .where(and(eq(pagePresence.pageId, input.pageId), eq(pagePresence.email, cleanEmail)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(pagePresence)
        .set({ role: input.role, name: cleanName, lastPing: new Date() })
        .where(eq(pagePresence.id, existing[0].id));
    } else {
      await db.insert(pagePresence).values({
        pageId: input.pageId,
        email: cleanEmail,
        name: cleanName,
        role: input.role,
        lastPing: new Date(),
      });
    }

    return await fetchActivePresence(input.pageId);
  } catch (err) {
    console.error('Error recording presence:', err);
    return [];
  }
}

export async function fetchPublicPage(pageId: string): Promise<SharedPageData | null> {
  try {
    const pageList = await db
      .select()
      .from(pages)
      .where(and(eq(pages.id, pageId), eq(pages.isDeleted, false)))
      .limit(1);

    if (pageList.length === 0) return null;
    const page = pageList[0];

    let session = null;
    try {
      session = await getSessionImpl();
    } catch {}
    const userEmail = session?.email ? session.email.trim().toLowerCase() : null;

    let userShare: { role: 'viewer' | 'editor' } | null = null;
    if (userEmail) {
      const shares = await db
        .select({ role: pageShares.role })
        .from(pageShares)
        .where(and(eq(pageShares.pageId, pageId), eq(pageShares.email, userEmail)))
        .limit(1);

      if (shares.length > 0) {
        userShare = shares[0];
      }
    }

    const isWorkspaceMember = !!(session && session.workspaceId === page.workspaceId);

    let accessLevel: 'editor' | 'viewer' | null = null;

    if (isWorkspaceMember) {
      accessLevel = 'editor';
    } else if (userShare) {
      accessLevel = userShare.role;
    } else if (page.visibility === 'public_edit') {
      accessLevel = session ? 'editor' : 'viewer';
    } else if (page.visibility === 'public') {
      accessLevel = 'viewer';
    }

    if (!accessLevel) {
      return null;
    }

    // Auto-record pageShare entry for logged-in user accessing shared link
    if (userEmail && !userShare) {
      try {
        await db.insert(pageShares).values({
          pageId,
          email: userEmail,
          role: accessLevel,
        });
      } catch {}
    }

    const activeUsers = await fetchActivePresence(pageId);

    return {
      page,
      accessLevel,
      isLoggedIn: !!session,
      userEmail,
      isWorkspaceMember,
      activeUsers,
    };
  } catch (err) {
    console.error('Error fetching public page:', err);
    return null;
  }
}

export async function createNewPage(input: {
  workspaceId: string;
  parentId?: string | null;
  title?: string;
  icon?: string;
  visibility?: 'private' | 'workspace' | 'public' | 'public_edit';
}) {
  try {
    const targetWorkspaceId = await resolveWorkspaceId(input.workspaceId);
    if (!targetWorkspaceId) return null;

    const existingInParent = await db
      .select({ order: pages.order })
      .from(pages)
      .where(
        and(
          eq(pages.workspaceId, targetWorkspaceId),
          input.parentId ? eq(pages.parentId, input.parentId) : isNull(pages.parentId),
          eq(pages.isDeleted, false)
        )
      )
      .orderBy(desc(pages.order))
      .limit(1);

    const nextOrder = existingInParent.length > 0 ? existingInParent[0].order + 1 : 0;

    const [newPage] = await db
      .insert(pages)
      .values({
        workspaceId: targetWorkspaceId,
        parentId: input.parentId || null,
        title: input.title || 'Untitled',
        icon: input.icon || '📄',
        visibility: input.visibility || 'workspace',
        order: nextOrder,
        content: [],
        contentText: '',
      })
      .returning();

    return newPage;
  } catch (err) {
    console.error('Error creating page:', err);
    return null;
  }
}

function isBlocksContentEmpty(content: any): boolean {
  if (!content) return true;
  if (!Array.isArray(content) || content.length === 0) return true;
  if (content.length === 1) {
    const block = content[0];
    const hasNoContent = !block.content || (Array.isArray(block.content) && block.content.length === 0);
    const hasNoText = !block.text;
    const hasNoChildren = !block.children || (Array.isArray(block.children) && block.children.length === 0);
    if ((block.type === 'paragraph' || !block.type) && hasNoContent && hasNoText && hasNoChildren) {
      return true;
    }
  }
  return false;
}

export async function checkCanUserEditPage(pageId: string): Promise<boolean> {
  try {
    const pageList = await db
      .select({ workspaceId: pages.workspaceId, visibility: pages.visibility, isDeleted: pages.isDeleted })
      .from(pages)
      .where(and(eq(pages.id, pageId), eq(pages.isDeleted, false)))
      .limit(1);

    if (pageList.length === 0) return false;
    const page = pageList[0];

    let session = null;
    try {
      session = await getSessionImpl();
    } catch {}

    if (session && session.workspaceId === page.workspaceId) {
      return true;
    }

    const userEmail = session?.email ? session.email.trim().toLowerCase() : null;

    if (userEmail) {
      const shares = await db
        .select({ role: pageShares.role })
        .from(pageShares)
        .where(and(eq(pageShares.pageId, pageId), eq(pageShares.email, userEmail)))
        .limit(1);

      if (shares.length > 0) {
        return shares[0].role === 'editor';
      }
    }

    if (page.visibility === 'public_edit') {
      return !!session;
    }

    return false;
  } catch (err) {
    console.error('Error checking edit permissions:', err);
    return false;
  }
}

export async function savePageContent(input: { pageId: string; content: any; contentText: string }) {
  try {
    const canEdit = await checkCanUserEditPage(input.pageId);
    if (!canEdit) {
      console.warn(`[Permission Denied] Blocked savePageContent for page ${input.pageId}. User has view-only access or edit access was revoked.`);
      return null;
    }

    const isIncomingEmpty = isBlocksContentEmpty(input.content) && (!input.contentText || input.contentText.trim().length === 0);

    if (isIncomingEmpty) {
      const existing = await db
        .select({ content: pages.content, contentText: pages.contentText })
        .from(pages)
        .where(eq(pages.id, input.pageId))
        .limit(1);

      if (existing.length > 0 && !isBlocksContentEmpty(existing[0].content)) {
        console.warn(`[Anti-Wipe Shield] Preserved existing DB content for page ${input.pageId}. Rejected empty payload.`);
        return { id: input.pageId, updatedAt: new Date() };
      }
    }

    const [updated] = await db
      .update(pages)
      .set({
        content: input.content,
        contentText: input.contentText,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, input.pageId))
      .returning({ id: pages.id, updatedAt: pages.updatedAt });

    return updated;
  } catch (err) {
    console.error('Error updating page content:', err);
    return null;
  }
}

export async function savePageMeta(input: { pageId: string; title?: string; icon?: string | null }) {
  try {
    const canEdit = await checkCanUserEditPage(input.pageId);
    if (!canEdit) {
      console.warn(`[Permission Denied] Blocked savePageMeta for page ${input.pageId}. User has view-only access or edit access was revoked.`);
      return null;
    }

    const updatePayload: Record<string, any> = { updatedAt: new Date() };
    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.icon !== undefined) updatePayload.icon = input.icon;

    const [updated] = await db
      .update(pages)
      .set(updatePayload)
      .where(eq(pages.id, input.pageId))
      .returning();

    return updated;
  } catch (err) {
    console.error('Error updating page meta:', err);
    return null;
  }
}

export async function savePageVisibility(input: { pageId: string; visibility: 'private' | 'workspace' | 'public' | 'public_edit' }) {
  try {
    const canEdit = await checkCanUserEditPage(input.pageId);
    if (!canEdit) {
      console.warn(`[Permission Denied] Blocked savePageVisibility for page ${input.pageId}.`);
      return null;
    }

    const [updated] = await db
      .update(pages)
      .set({
        visibility: input.visibility,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, input.pageId))
      .returning();

    return updated;
  } catch (err) {
    console.error('Error updating page visibility:', err);
    return null;
  }
}

export async function reorderPageInDb(input: {
  pageId: string;
  targetParentId?: string | null;
  targetOrder?: number;
}) {
  try {
    const { pageId, targetParentId = null, targetOrder = 0 } = input;
    if (targetParentId === pageId) return null;

    const canEdit = await checkCanUserEditPage(pageId);
    if (!canEdit) return null;

    const pageList = await db.select({ workspaceId: pages.workspaceId }).from(pages).where(eq(pages.id, pageId)).limit(1);
    if (pageList.length === 0) return null;
    const workspaceId = pageList[0].workspaceId;

    const siblings = await db
      .select({ id: pages.id, order: pages.order })
      .from(pages)
      .where(
        and(
          eq(pages.workspaceId, workspaceId),
          targetParentId ? eq(pages.parentId, targetParentId) : isNull(pages.parentId),
          eq(pages.isDeleted, false)
        )
      )
      .orderBy(asc(pages.order));

    const otherSiblings = siblings.filter((s) => s.id !== pageId);
    const clampOrder = Math.max(0, Math.min(otherSiblings.length, targetOrder));
    otherSiblings.splice(clampOrder, 0, { id: pageId, order: clampOrder });

    for (let i = 0; i < otherSiblings.length; i++) {
      const sib = otherSiblings[i];
      await db
        .update(pages)
        .set({
          parentId: targetParentId,
          order: i,
          updatedAt: new Date(),
        })
        .where(eq(pages.id, sib.id));
    }

    return { success: true };
  } catch (err) {
    console.error('Error reordering page in db:', err);
    return null;
  }
}

export async function performSoftDelete(pageId: string) {
  try {
    const softDeleteRecursive = async (id: string) => {
      await db
        .update(pages)
        .set({ isDeleted: true, deletedAt: new Date() })
        .where(eq(pages.id, id));

      const children = await db.select({ id: pages.id }).from(pages).where(eq(pages.parentId, id));
      for (const child of children) {
        await softDeleteRecursive(child.id);
      }
    };

    await softDeleteRecursive(pageId);
    return { success: true };
  } catch (err) {
    console.error('Error soft deleting page:', err);
    return { success: false };
  }
}

export async function performRestore(pageId: string) {
  try {
    const restoreRecursive = async (id: string) => {
      await db
        .update(pages)
        .set({ isDeleted: false, deletedAt: null })
        .where(eq(pages.id, id));

      const children = await db.select({ id: pages.id }).from(pages).where(eq(pages.parentId, id));
      for (const child of children) {
        await restoreRecursive(child.id);
      }
    };

    await restoreRecursive(pageId);
    return { success: true };
  } catch (err) {
    console.error('Error restoring page:', err);
    return { success: false };
  }
}

export async function fetchTrashPages(workspaceId: string) {
  try {
    const targetWorkspaceId = await resolveWorkspaceId(workspaceId);
    if (!targetWorkspaceId) return [];
    return await db
      .select({
        id: pages.id,
        title: pages.title,
        icon: pages.icon,
        deletedAt: pages.deletedAt,
      })
      .from(pages)
      .where(and(eq(pages.workspaceId, targetWorkspaceId), eq(pages.isDeleted, true)))
      .orderBy(desc(pages.deletedAt));
  } catch (err) {
    console.error('Error fetching trash pages:', err);
    return [];
  }
}

export async function performPermanentDelete(pageId: string) {
  try {
    await db.delete(pages).where(eq(pages.id, pageId));
    return { success: true };
  } catch (err) {
    console.error('Error permanent deleting page:', err);
    return { success: false };
  }
}

export async function performEmptyTrash(workspaceId: string) {
  try {
    const targetWorkspaceId = await resolveWorkspaceId(workspaceId);
    if (!targetWorkspaceId) return { success: false };

    await db
      .delete(pages)
      .where(and(eq(pages.workspaceId, targetWorkspaceId), eq(pages.isDeleted, true)));

    return { success: true };
  } catch (err) {
    console.error('Error emptying trash:', err);
    return { success: false };
  }
}

function fuzzyMatchScore(text: string, query: string, tokens: string[]): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  if (lower === lowerQuery) return 100;
  if (lower.startsWith(lowerQuery)) return 80;
  if (lower.includes(lowerQuery)) return 60;

  let tokenMatches = 0;
  for (const token of tokens) {
    if (lower.includes(token)) {
      tokenMatches++;
    } else {
      let idx = 0;
      for (let i = 0; i < lower.length && idx < token.length; i++) {
        if (lower[i] === token[idx]) idx++;
      }
      if (idx === token.length && token.length > 2) {
        tokenMatches += 0.6;
      }
    }
  }

  if (tokenMatches > 0) {
    return Math.round((tokenMatches / tokens.length) * 40);
  }

  return 0;
}

function extractSnippet(contentText: string | null, query: string, tokens: string[]): string | null {
  if (!contentText || !contentText.trim()) return null;
  const clean = contentText.trim();
  const lower = clean.toLowerCase();
  const lowerQuery = query.toLowerCase();

  let matchIdx = lower.indexOf(lowerQuery);
  if (matchIdx === -1) {
    for (const token of tokens) {
      const idx = lower.indexOf(token);
      if (idx !== -1) {
        matchIdx = idx;
        break;
      }
    }
  }

  if (matchIdx === -1) {
    return clean.slice(0, 120) + (clean.length > 120 ? '...' : '');
  }

  const start = Math.max(0, matchIdx - 30);
  const end = Math.min(clean.length, matchIdx + 90);
  let snippet = clean.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < clean.length) snippet = snippet + '...';
  return snippet;
}

export interface SearchResult {
  id: string;
  title: string;
  icon: string | null;
  snippet: string | null;
  updatedAt: Date;
  matchType: 'title' | 'content' | 'both';
  score: number;
}

export async function performSearchPages(workspaceId: string, query: string): Promise<SearchResult[]> {
  try {
    const cleanQuery = query.trim();
    if (!cleanQuery || cleanQuery.length < 3) return [];

    const targetWorkspaceId = await resolveWorkspaceId(workspaceId);
    if (!targetWorkspaceId) return [];

    const session = await getSessionImpl();
    const userEmail = session?.email ? session.email.trim().toLowerCase() : null;

    const workspacePages = await db
      .select({
        id: pages.id,
        title: pages.title,
        icon: pages.icon,
        contentText: pages.contentText,
        updatedAt: pages.updatedAt,
      })
      .from(pages)
      .where(and(eq(pages.workspaceId, targetWorkspaceId), eq(pages.isDeleted, false)));

    let sharedPagesList: typeof workspacePages = [];
    if (userEmail) {
      sharedPagesList = await db
        .select({
          id: pages.id,
          title: pages.title,
          icon: pages.icon,
          contentText: pages.contentText,
          updatedAt: pages.updatedAt,
        })
        .from(pageShares)
        .innerJoin(pages, eq(pageShares.pageId, pages.id))
        .where(and(eq(pageShares.email, userEmail), eq(pages.isDeleted, false)));
    }

    const allCandidatePagesMap = new Map<string, typeof workspacePages[0]>();
    for (const p of [...workspacePages, ...sharedPagesList]) {
      allCandidatePagesMap.set(p.id, p);
    }

    const tokens = cleanQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const results: SearchResult[] = [];

    for (const page of allCandidatePagesMap.values()) {
      const titleScore = fuzzyMatchScore(page.title || '', cleanQuery, tokens);
      const contentScore = fuzzyMatchScore(page.contentText || '', cleanQuery, tokens);

      const totalScore = titleScore * 1.5 + contentScore * 0.8;

      if (totalScore > 0) {
        let matchType: 'title' | 'content' | 'both' = 'content';
        if (titleScore > 0 && contentScore > 0) matchType = 'both';
        else if (titleScore > 0) matchType = 'title';

        results.push({
          id: page.id,
          title: page.title || 'Untitled',
          icon: page.icon || '📄',
          snippet: extractSnippet(page.contentText, cleanQuery, tokens),
          updatedAt: page.updatedAt,
          matchType,
          score: totalScore,
        });
      }
    }

    results.sort((a, b) => b.score - a.score || b.updatedAt.getTime() - a.updatedAt.getTime());

    return results.slice(0, 20);
  } catch (err) {
    console.error('Error searching pages:', err);
    return [];
  }
}

export async function fetchChildPages(parentId: string) {
  try {
    return await db
      .select({
        id: pages.id,
        workspaceId: pages.workspaceId,
        parentId: pages.parentId,
        title: pages.title,
        icon: pages.icon,
        order: pages.order,
        createdAt: pages.createdAt,
        updatedAt: pages.updatedAt,
      })
      .from(pages)
      .where(and(eq(pages.parentId, parentId), eq(pages.isDeleted, false)))
      .orderBy(asc(pages.order), asc(pages.createdAt));
  } catch (err) {
    console.error('Error fetching child pages:', err);
    return [];
  }
}

export async function fetchPageShares(pageId: string) {
  try {
    const pageRecord = await db
      .select({ workspaceId: pages.workspaceId })
      .from(pages)
      .where(eq(pages.id, pageId))
      .limit(1);

    let owner: { id: string; email: string; name: string | null } | null = null;

    if (pageRecord.length > 0) {
      const ws = await db
        .select({ ownerId: workspaces.ownerId })
        .from(workspaces)
        .where(eq(workspaces.id, pageRecord[0].workspaceId))
        .limit(1);

      if (ws.length > 0) {
        const ownerUsers = await db
          .select({ id: users.id, email: users.email, name: users.name })
          .from(users)
          .where(eq(users.id, ws[0].ownerId))
          .limit(1);

        if (ownerUsers.length > 0) {
          owner = ownerUsers[0];
        }
      }
    }

    const shares = await db
      .select({
        id: pageShares.id,
        pageId: pageShares.pageId,
        email: pageShares.email,
        role: pageShares.role,
        createdAt: pageShares.createdAt,
      })
      .from(pageShares)
      .where(eq(pageShares.pageId, pageId))
      .orderBy(asc(pageShares.createdAt));

    return {
      owner,
      shares,
    };
  } catch (err) {
    console.error('Error fetching page shares:', err);
    return { owner: null, shares: [] };
  }
}

export async function inviteUserToPage(input: {
  pageId: string;
  email: string;
  role: 'viewer' | 'editor';
}) {
  try {
    const cleanEmail = input.email.trim().toLowerCase();
    if (!cleanEmail) return null;

    const existing = await db
      .select()
      .from(pageShares)
      .where(and(eq(pageShares.pageId, input.pageId), eq(pageShares.email, cleanEmail)))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(pageShares)
        .set({ role: input.role })
        .where(eq(pageShares.id, existing[0].id))
        .returning();
      return updated;
    }

    const [newShare] = await db
      .insert(pageShares)
      .values({
        pageId: input.pageId,
        email: cleanEmail,
        role: input.role,
      })
      .returning();

    return newShare;
  } catch (err) {
    console.error('Error inviting user to page:', err);
    return null;
  }
}

export async function removePageShare(shareId: string) {
  try {
    await db.delete(pageShares).where(eq(pageShares.id, shareId));
    return { success: true };
  } catch (err) {
    console.error('Error removing page share:', err);
    return { success: false };
  }
}

export async function updatePageShareRole(input: { shareId: string; role: 'viewer' | 'editor' }) {
  try {
    const [updated] = await db
      .update(pageShares)
      .set({ role: input.role })
      .where(eq(pageShares.id, input.shareId))
      .returning();
    return updated;
  } catch (err) {
    console.error('Error updating page share role:', err);
    return null;
  }
}

export interface BacklinkItem {
  id: string;
  title: string;
  icon: string | null;
  updatedAt: Date;
  snippet?: string | null;
}

export async function fetchPageBacklinks(pageId: string): Promise<BacklinkItem[]> {
  try {
    const [targetPage] = await db
      .select({ workspaceId: pages.workspaceId })
      .from(pages)
      .where(eq(pages.id, pageId))
      .limit(1);

    if (!targetPage) return [];

    const candidatePages = await db
      .select({
        id: pages.id,
        title: pages.title,
        icon: pages.icon,
        content: pages.content,
        contentText: pages.contentText,
        updatedAt: pages.updatedAt,
      })
      .from(pages)
      .where(
        and(
          eq(pages.workspaceId, targetPage.workspaceId),
          eq(pages.isDeleted, false),
          ne(pages.id, pageId)
        )
      )
      .orderBy(desc(pages.updatedAt));

    const backlinks: BacklinkItem[] = [];

    for (const p of candidatePages) {
      const contentStr = p.content ? JSON.stringify(p.content) : '';
      const textStr = p.contentText || '';

      const containsPageId = contentStr.includes(pageId) || textStr.includes(pageId);

      if (containsPageId) {
        let snippet = textStr.slice(0, 100);
        const mentionIdx = textStr.indexOf(pageId);
        if (mentionIdx !== -1) {
          const start = Math.max(0, mentionIdx - 30);
          const end = Math.min(textStr.length, mentionIdx + 70);
          snippet = (start > 0 ? '...' : '') + textStr.slice(start, end) + (end < textStr.length ? '...' : '');
        }

        backlinks.push({
          id: p.id,
          title: p.title || 'Untitled',
          icon: p.icon,
          updatedAt: p.updatedAt,
          snippet: snippet ? snippet.trim() : null,
        });
      }
    }

    return backlinks;
  } catch (err) {
    console.error('Error fetching backlinks:', err);
    return [];
  }
}

export interface WorkspaceUserItem {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: string | null;
}

export async function fetchWorkspaceUsers(providedWorkspaceId?: string): Promise<WorkspaceUserItem[]> {
  try {
    let workspaceId = providedWorkspaceId;
    let sessionUser: any = null;

    try {
      sessionUser = await getSessionImpl();
    } catch {}

    if (!workspaceId && sessionUser) {
      workspaceId = sessionUser.workspaceId;
    }

    if (!workspaceId) {
      return [];
    }

    // 1. Get workspace owner
    const wsList = await db
      .select({ ownerId: workspaces.ownerId })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    const ownerId = wsList.length > 0 ? wsList[0].ownerId : null;

    // 2. Get workspace members from workspaceMembers table (NOT pageShares)
    const membersList = await db
      .select({
        id: workspaceMembers.id,
        userId: workspaceMembers.userId,
        email: workspaceMembers.email,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));

    const memberEmailsMap = new Map<string, string>();
    membersList.forEach((m) => {
      if (m.email) {
        memberEmailsMap.set(m.email.toLowerCase().trim(), m.role || 'member');
      }
    });

    // 3. Fetch registered users matching workspace owner or workspace members
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        role: users.role,
      })
      .from(users)
      .orderBy(asc(users.name), asc(users.email));

    const result: WorkspaceUserItem[] = [];
    const seenEmails = new Set<string>();

    allUsers.forEach((u) => {
      const emailLower = u.email.toLowerCase().trim();
      const isOwner = ownerId && u.id === ownerId;
      const isMember = memberEmailsMap.has(emailLower);

      if (isOwner || isMember) {
        seenEmails.add(emailLower);
        let role = u.role || 'Member';
        if (isOwner) role = 'Workspace Owner';
        else if (isMember) role = memberEmailsMap.get(emailLower) === 'admin' ? 'Admin' : 'Member';

        result.push({
          id: u.id,
          name: u.name || u.email.split('@')[0],
          email: u.email,
          avatarUrl: u.avatarUrl,
          role,
        });
      }
    });

    // 4. Include pending invited member emails who don't have a user account yet
    memberEmailsMap.forEach((role, email) => {
      if (!seenEmails.has(email)) {
        seenEmails.add(email);
        result.push({
          id: `member-${email}`,
          name: email.split('@')[0],
          email,
          avatarUrl: null,
          role: role === 'admin' ? 'Admin (Pending)' : 'Member (Pending)',
        });
      }
    });

    return result;
  } catch (err) {
    console.error('Error fetching workspace users:', err);
    return [];
  }
}

export async function inviteWorkspaceMember(input: {
  workspaceId?: string;
  email: string;
  role?: 'owner' | 'admin' | 'member';
}) {
  try {
    const session = await getSessionImpl();
    if (!session) return { success: false, error: 'Unauthorized.' };

    const targetWsId = input.workspaceId || session.workspaceId;
    const cleanEmail = input.email.trim().toLowerCase();
    if (!cleanEmail) return { success: false, error: 'Email is required.' };

    // Check if user is already owner
    const wsList = await db
      .select({ ownerId: workspaces.ownerId })
      .from(workspaces)
      .where(eq(workspaces.id, targetWsId))
      .limit(1);

    if (wsList.length > 0) {
      const ownerUser = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, wsList[0].ownerId))
        .limit(1);
      if (ownerUser.length > 0 && ownerUser[0].email.toLowerCase().trim() === cleanEmail) {
        return { success: true, message: 'User is already the workspace owner.' };
      }
    }

    // Check existing workspaceMembers
    const existing = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, targetWsId), eq(workspaceMembers.email, cleanEmail)))
      .limit(1);

    if (existing.length > 0) {
      return { success: true, member: existing[0] };
    }

    // Match existing user ID if user is already registered
    const userMatch = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    const [newMember] = await db
      .insert(workspaceMembers)
      .values({
        workspaceId: targetWsId,
        userId: userMatch.length > 0 ? userMatch[0].id : null,
        email: cleanEmail,
        role: input.role || 'member',
      })
      .returning();

    return { success: true, member: newMember };
  } catch (err: any) {
    console.error('Error inviting workspace member:', err);
    return { success: false, error: err.message || 'Failed to invite workspace member.' };
  }
}



