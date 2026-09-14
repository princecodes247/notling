import { db } from '~/db';
import { users, workspaces, sessions, pages, uploads, workspaceMembers } from '~/db/schema';
import { eq, and, gt, or, sql } from 'drizzle-orm';
import type { UserSession, AuthResponse, UserWorkspaceItem } from './auth';
import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server';
import { sanitizeServerError } from './errors';
import crypto from 'node:crypto';

const COOKIE_NAME = 'notling_session';
const ACTIVE_WS_COOKIE = 'notling_active_workspace_id';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

// Helper to hash password using PBKDF2
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const selectedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(password, selectedSalt, 10000, 64, 'sha512');
  return {
    hash: `${selectedSalt}:${derivedKey.toString('hex')}`,
    salt: selectedSalt,
  };
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt] = storedHash.split(':');
  const { hash } = hashPassword(password, salt);
  return hash === storedHash;
}

// Seed initial Welcome to Notling tour document
export async function seedWelcomeDocument(workspaceId: string): Promise<string> {
  const [welcomePage] = await db
    .insert(pages)
    .values({
      workspaceId,
      title: 'Welcome to Notling',
      icon: '🚀',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Welcome to your new Notling workspace! Notling is built for fast notes, specs, and real-time team collaboration.',
              styles: {},
            },
          ],
        },
        {
          type: 'heading',
          props: { level: 2 },
          content: [
            {
              type: 'text',
              text: '⚡ Quick Start Checklist',
              styles: {},
            },
          ],
        },
        {
          type: 'checkListItem',
          props: { checked: false },
          content: [
            {
              type: 'text',
              text: 'Type / anywhere in this document to open the slash command menu',
              styles: {},
            },
          ],
        },
        {
          type: 'checkListItem',
          props: { checked: false },
          content: [
            {
              type: 'text',
              text: 'Highlight text to format bold, italic, code, or change block types',
              styles: {},
            },
          ],
        },
        {
          type: 'checkListItem',
          props: { checked: false },
          content: [
            {
              type: 'text',
              text: 'Click + New Page in the sidebar or tab bar to create a fresh doc',
              styles: {},
            },
          ],
        },
        {
          type: 'checkListItem',
          props: { checked: false },
          content: [
            {
              type: 'text',
              text: 'Share this page with your team or publish to web using the Share button',
              styles: {},
            },
          ],
        },
        {
          type: 'heading',
          props: { level: 2 },
          content: [
            {
              type: 'text',
              text: '💡 Key Features at a Glance',
              styles: {},
            },
          ],
        },
        {
          type: 'bulletListItem',
          content: [
            {
              type: 'text',
              text: 'Instant Workspace Search: Press Cmd+K or Ctrl+K anytime',
              styles: {},
            },
          ],
        },
        {
          type: 'bulletListItem',
          content: [
            {
              type: 'text',
              text: 'Browser-Style Tabs: Keep multiple docs open concurrently',
              styles: {},
            },
          ],
        },
        {
          type: 'bulletListItem',
          content: [
            {
              type: 'text',
              text: 'Real-Time Sync & Presence: See cursor updates as collaborators edit',
              styles: {},
            },
          ],
        },
      ],
    })
    .returning();

  return welcomePage.id;
}

// Generate random session token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create session in DB and set HTTP cookie
async function createSessionAndCookie(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  });

  setCookie(COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
  });

  return token;
}

// Helper to slugify workspace name
export function slugify(text: string): string {
  const slug = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
  return slug || 'workspace';
}

export async function generateUniqueWorkspaceSlug(nameOrSlug: string, excludeWorkspaceId?: string): Promise<string> {
  const baseSlug = slugify(nameOrSlug);
  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, candidate))
      .limit(1);

    if (existing.length === 0 || (excludeWorkspaceId && existing[0].id === excludeWorkspaceId)) {
      return candidate;
    }
    candidate = `${baseSlug}-${counter}`;
    counter++;
  }
}

export async function checkWorkspaceSlugImpl(input: {
  slug: string;
  excludeWorkspaceId?: string;
}): Promise<{ isAvailable: boolean; candidateSlug: string; cleanSlug: string }> {
  const cleanSlug = slugify(input.slug);
  const existing = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, cleanSlug))
    .limit(1);

  const isAvailable =
    existing.length === 0 || (!!input.excludeWorkspaceId && existing[0].id === input.excludeWorkspaceId);

  const candidateSlug = await generateUniqueWorkspaceSlug(cleanSlug, input.excludeWorkspaceId);

  return {
    isAvailable,
    candidateSlug,
    cleanSlug,
  };
}

export async function getUserWorkspacesImpl(): Promise<UserWorkspaceItem[]> {
  try {
    const session = await getSessionImpl();
    if (!session) return [];

    // 1. Owned workspaces
    const owned = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        icon: workspaces.icon,
      })
      .from(workspaces)
      .where(eq(workspaces.ownerId, session.userId));

    const result: UserWorkspaceItem[] = owned.map((w) => ({
      ...w,
      role: 'owner',
    }));

    const seenIds = new Set(result.map((w) => w.id));

    // 2. Member workspaces (via workspaceMembers table, NOT pageShares)
    if (session.email) {
      const cleanEmail = session.email.trim().toLowerCase();
      const memberList = await db
        .select({
          id: workspaces.id,
          name: workspaces.name,
          slug: workspaces.slug,
          icon: workspaces.icon,
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
        .where(
          session.userId
            ? or(eq(workspaceMembers.userId, session.userId), eq(workspaceMembers.email, cleanEmail))
            : eq(workspaceMembers.email, cleanEmail)
        );

      for (const mw of memberList) {
        if (!seenIds.has(mw.id)) {
          seenIds.add(mw.id);
          result.push({ ...mw, role: 'member' });
        }
      }
    }

    return result;
  } catch (err) {
    console.error('Error fetching user workspaces:', err);
    return [];
  }
}

export async function switchWorkspaceImpl(targetWorkspaceId: string): Promise<AuthResponse> {
  try {
    const session = await getSessionImpl();
    if (!session) {
      return { success: false, error: 'Unauthorized.' };
    }

    const availableWorkspaces = await getUserWorkspacesImpl();
    const targetWs = availableWorkspaces.find((w) => w.id === targetWorkspaceId);

    if (!targetWs) {
      return { success: false, error: 'Workspace not found or access denied.' };
    }

    setCookie(ACTIVE_WS_COOKIE, targetWorkspaceId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE,
    });

    const updatedSession = await getSessionImpl();
    return {
      success: true,
      session: updatedSession,
    };
  } catch (err: any) {
    return { success: false, error: sanitizeServerError(err, 'Failed to switch workspace.') };
  }
}

export async function switchWorkspaceBySlugImpl(slug: string): Promise<AuthResponse> {
  try {
    const session = await getSessionImpl();
    if (!session) {
      return { success: false, error: 'Unauthorized.' };
    }

    const availableWorkspaces = await getUserWorkspacesImpl();
    const cleanSlug = slug.trim().toLowerCase();
    const targetWs = availableWorkspaces.find((w) => w.slug.toLowerCase() === cleanSlug);

    if (!targetWs) {
      return { success: false, error: 'Workspace not found or access denied.' };
    }

    setCookie(ACTIVE_WS_COOKIE, targetWs.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE,
    });

    const updatedSession = await getSessionImpl();
    return {
      success: true,
      session: updatedSession,
    };
  } catch (err: any) {
    return { success: false, error: sanitizeServerError(err, 'Failed to switch workspace.') };
  }
}

export async function createWorkspaceImpl(input: {
  name: string;
  icon?: string;
  description?: string;
}): Promise<AuthResponse> {
  try {
    const session = await getSessionImpl();
    if (!session) {
      return { success: false, error: 'Unauthorized.' };
    }

    const wsName = input.name.trim() || 'New Workspace';
    const wsSlug = await generateUniqueWorkspaceSlug(wsName);

    const [newWs] = await db
      .insert(workspaces)
      .values({
        ownerId: session.userId,
        name: wsName,
        slug: wsSlug,
        icon: input.icon || '🚀',
        description: input.description || null,
      })
      .returning();

    setCookie(ACTIVE_WS_COOKIE, newWs.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE,
    });

    const updatedSession = await getSessionImpl();
    return {
      success: true,
      session: updatedSession,
    };
  } catch (err: any) {
    return { success: false, error: sanitizeServerError(err, 'Failed to create workspace.') };
  }
}

export async function getSessionImpl(): Promise<UserSession | null> {
  try {
    const token = getCookie(COOKIE_NAME);
    if (!token) {
      return null;
    }

    const activeWsCookie = getCookie(ACTIVE_WS_COOKIE);

    // Single query joining sessions, users, and optionally the active workspace
    const activeSession = await db
      .select({
        session: sessions,
        user: users,
        workspace: workspaces,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .leftJoin(workspaces, activeWsCookie ? eq(workspaces.id, activeWsCookie) : sql`false`)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);

    if (!activeSession || activeSession.length === 0) {
      deleteCookie(COOKIE_NAME, { path: '/' });
      return null;
    }

    const { user, workspace: cookieWs } = activeSession[0];
    let workspace = null;

    if (cookieWs) {
      if (cookieWs.ownerId === user.id) {
        workspace = cookieWs;
      } else if (user.email) {
        const cleanEmail = user.email.trim().toLowerCase();
        const memberRecord = await db
          .select({ id: workspaceMembers.id })
          .from(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.workspaceId, cookieWs.id),
              or(eq(workspaceMembers.userId, user.id), eq(workspaceMembers.email, cleanEmail))
            )
          )
          .limit(1);

        if (memberRecord.length > 0) {
          workspace = cookieWs;
        }
      }
    }

    if (!workspace) {
      // Fallback to first owned workspace
      const userWorkspaces = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.ownerId, user.id))
        .limit(1);

      workspace = userWorkspaces[0];
    }

    if (!workspace) {
      const wsName = `${user.name || 'Personal'}'s Workspace`;
      const wsSlug = await generateUniqueWorkspaceSlug(wsName);
      const [newWs] = await db
        .insert(workspaces)
        .values({
          ownerId: user.id,
          name: wsName,
          slug: wsSlug,
          icon: '🚀',
        })
        .returning();
      workspace = newWs;
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isOnboarded: user.isOnboarded,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
      workspaceIcon: workspace.icon || '🚀',
      welcomePageId: undefined,
      isWorkspaceOwner: workspace.ownerId === user.id,
    };
  } catch (err) {
    console.error('Error fetching session:', err);
    return null;
  }
}

export async function signUpWithEmailImpl(
  email: string,
  password: string,
  name?: string
): Promise<AuthResponse> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' };
  }

  const existing = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
  if (existing.length > 0) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  const { hash } = hashPassword(password);
  const displayName = name?.trim() || cleanEmail.split('@')[0];

  const [user] = await db
    .insert(users)
    .values({
      email: cleanEmail,
      name: displayName,
      avatarUrl: null,
      passwordHash: hash,
      provider: 'email',
      providerAccountId: cleanEmail,
      isOnboarded: false,
    })
    .returning();

  const wsName = `${displayName}'s Workspace`;
  const wsSlug = await generateUniqueWorkspaceSlug(wsName);

  const [workspace] = await db
    .insert(workspaces)
    .values({
      ownerId: user.id,
      name: wsName,
      slug: wsSlug,
      icon: '🚀',
    })
    .returning();

  const welcomePageId = await seedWelcomeDocument(workspace.id);

  await createSessionAndCookie(user.id);

  return {
    success: true,
    session: {
      userId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isOnboarded: user.isOnboarded,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
      workspaceIcon: workspace.icon || '🚀',
      welcomePageId,
    },
  };
}

export async function signInWithEmailImpl(email: string, password: string): Promise<AuthResponse> {
  const cleanEmail = email.trim().toLowerCase();
  const existing = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
  const user = existing[0];

  if (!user || !user.passwordHash) {
    return { success: false, error: 'Invalid email or password.' };
  }

  const valid = verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { success: false, error: 'Invalid email or password.' };
  }

  const userWorkspaces = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.ownerId, user.id))
    .limit(1);

  let workspace = userWorkspaces[0];
  if (!workspace) {
    const wsName = `${user.name || 'User'}'s Workspace`;
    const wsSlug = await generateUniqueWorkspaceSlug(wsName);
    const [newWs] = await db
      .insert(workspaces)
      .values({
        ownerId: user.id,
        name: wsName,
        slug: wsSlug,
        icon: '🚀',
      })
      .returning();
    workspace = newWs;
  }

  await createSessionAndCookie(user.id);

  return {
    success: true,
    session: {
      userId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isOnboarded: user.isOnboarded,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
      workspaceIcon: workspace.icon || '🚀',
    },
  };
}

export async function getOAuthUrlImpl(provider: 'google' | 'github', redirectUri: string): Promise<{ url: string }> {
  if (provider === 'github') {
    const clientId = process.env.GITHUB_CLIENT_ID || 'dummy_github_client_id';
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
    return { url };
  } else {
    const clientId = process.env.GOOGLE_CLIENT_ID || 'dummy_google_client_id';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile`;
    return { url };
  }
}

export async function processOAuthCallbackImpl(
  provider: 'google' | 'github',
  code: string,
  redirectUri: string
): Promise<AuthResponse> {
  try {
    let email = '';
    let name = '';
    let avatarUrl = '';
    let providerAccountId = '';

    if (provider === 'github') {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        return { success: false, error: 'GitHub OAuth credentials (GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET) not set in .env.local' };
      }

      // Exchange code for token
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return { success: false, error: tokenData.error_description || 'Failed to obtain GitHub access token.' };
      }

      // Fetch user profile
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'User-Agent': 'NotlingApp',
        },
      });
      const userData = await userRes.json();

      providerAccountId = String(userData.id);
      name = userData.name || userData.login;
      avatarUrl = userData.avatar_url;
      email = userData.email;

      if (!email) {
        // Fetch emails if primary email is private
        const emailsRes = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'User-Agent': 'NotlingApp',
          },
        });
        const emailsData = await emailsRes.json();
        if (Array.isArray(emailsData)) {
          const primary = emailsData.find((e: any) => e.primary && e.verified) || emailsData[0];
          if (primary) email = primary.email;
        }
      }
    } else {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        return { success: false, error: 'Google OAuth credentials (GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET) not set in .env.local' };
      }

      // Exchange code for token
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return { success: false, error: tokenData.error_description || 'Failed to obtain Google access token.' };
      }

      // Fetch user info
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      const userData = await userRes.json();

      providerAccountId = userData.id;
      name = userData.name;
      avatarUrl = userData.picture;
      email = userData.email;
    }

    if (!email) {
      return { success: false, error: 'OAuth provider did not return a valid email address.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    let existingUser = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
    let user = existingUser[0];

    let welcomePageId: string | undefined;

    if (!user) {
      try {
        const [newUser] = await db
          .insert(users)
          .values({
            email: cleanEmail,
            name: name || cleanEmail.split('@')[0],
            avatarUrl: avatarUrl || null,
            provider,
            providerAccountId,
            isOnboarded: false,
          })
          .onConflictDoUpdate({
            target: users.email,
            set: {
              name: name || cleanEmail.split('@')[0],
              avatarUrl: avatarUrl || null,
              provider,
              providerAccountId,
            },
          })
          .returning();
        user = newUser;
      } catch {
        const reFetch = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
        if (reFetch[0]) {
          user = reFetch[0];
        } else {
          throw new Error(`Failed to create or retrieve user for email ${cleanEmail}`);
        }
      }
    }

    let existingWs = await db.select().from(workspaces).where(eq(workspaces.ownerId, user.id)).limit(1);
    let workspace = existingWs[0];

    if (!workspace) {
      try {
        const wsName = `${user.name || 'User'}'s Workspace`;
        const wsSlug = await generateUniqueWorkspaceSlug(wsName);
        const [newWs] = await db
          .insert(workspaces)
          .values({
            ownerId: user.id,
            name: wsName,
            slug: wsSlug,
            icon: '🚀',
          })
          .returning();
        workspace = newWs;
        welcomePageId = await seedWelcomeDocument(workspace.id);
      } catch {
        const reFetchWs = await db.select().from(workspaces).where(eq(workspaces.ownerId, user.id)).limit(1);
        if (reFetchWs[0]) {
          workspace = reFetchWs[0];
        } else {
          throw new Error(`Failed to create or retrieve workspace for user ${user.id}`);
        }
      }
    }

    await createSessionAndCookie(user.id);

    return {
      success: true,
      session: {
        userId: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isOnboarded: user.isOnboarded,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        workspaceSlug: workspace.slug,
        workspaceIcon: workspace.icon || '🚀',
        welcomePageId,
      },
    };
  } catch (err: any) {
    return { success: false, error: sanitizeServerError(err, 'OAuth authentication failed.') };
  }
}

export async function completeOnboardingImpl(data: {
  name: string;
  avatarUrl?: string;
  role?: string;
  workspaceName: string;
  workspaceSlug?: string;
  workspaceIcon?: string;
  workspaceDescription?: string;
  templateId?: string;
}): Promise<AuthResponse> {
  const currentSession = await getSessionImpl();
  if (!currentSession) {
    return { success: false, error: 'Unauthorized. Please sign in.' };
  }

  // Update user
  const [updatedUser] = await db
    .update(users)
    .set({
      name: data.name,
      avatarUrl: data.avatarUrl || currentSession.avatarUrl,
      role: data.role || null,
      isOnboarded: true,
    })
    .where(eq(users.id, currentSession.userId))
    .returning();

  const wsName = data.workspaceName?.trim() || `${data.name}'s Workspace`;
  const rawSlug = data.workspaceSlug?.trim() || wsName;
  const finalSlug = await generateUniqueWorkspaceSlug(rawSlug, currentSession.workspaceId);

  // Update workspace
  const [updatedWs] = await db
    .update(workspaces)
    .set({
      name: wsName,
      slug: finalSlug,
      icon: data.workspaceIcon || '🚀',
      description: data.workspaceDescription || null,
    })
    .where(eq(workspaces.id, currentSession.workspaceId))
    .returning();

  // Seed starter template documents if selected
  if (data.templateId && data.templateId !== 'blank') {
    if (data.templateId === 'engineering') {
      const [folder] = await db.insert(pages).values({
        workspaceId: updatedWs.id,
        title: 'Engineering Hub',
        icon: '📁',
      }).returning();

      await db.insert(pages).values([
        {
          workspaceId: updatedWs.id,
          parentId: folder.id,
          title: 'System Architecture & Services',
          icon: '⚙️',
          content: [
            { type: 'heading', content: 'System Overview' },
            { type: 'paragraph', content: 'Distributed backend with TanStack Start, Nitro SSR, and PostgreSQL.' }
          ],
        },
        {
          workspaceId: updatedWs.id,
          parentId: folder.id,
          title: 'API Guidelines & Best Practices',
          icon: '📝',
          content: [
            { type: 'heading', content: 'REST & RPC Guidelines' },
            { type: 'paragraph', content: 'All server functions are type-safe via TanStack Start createServerFn.' }
          ],
        }
      ]);
    } else if (data.templateId === 'product') {
      const [folder] = await db.insert(pages).values({
        workspaceId: updatedWs.id,
        title: 'Product Roadmap & Specs',
        icon: '📁',
      }).returning();

      await db.insert(pages).values([
        {
          workspaceId: updatedWs.id,
          parentId: folder.id,
          title: 'Q3 Product Goals & Features',
          icon: '🎯',
          content: [
            { type: 'heading', content: 'Core Objectives' },
            { type: 'paragraph', content: 'Deliver modern Notion-like block editing, real authentication, and workspace search.' }
          ],
        },
        {
          workspaceId: updatedWs.id,
          parentId: folder.id,
          title: 'User Feedback & Insights',
          icon: '💡',
          content: [
            { type: 'heading', content: 'Customer Quotes' },
            { type: 'paragraph', content: 'Key requests: fast search, compact tabs, and custom onboarding workflows.' }
          ],
        }
      ]);
    } else if (data.templateId === 'personal') {
      await db.insert(pages).values([
        {
          workspaceId: updatedWs.id,
          title: 'Personal Daily Journal',
          icon: '📔',
          content: [{ type: 'paragraph', content: 'Ideas, reflections, and quick daily highlights.' }],
        },
        {
          workspaceId: updatedWs.id,
          title: 'Weekly Priorities & Tasks',
          icon: '📌',
          content: [{ type: 'paragraph', content: 'Top 3 goals for this week.' }],
        }
      ]);
    }
  }

  const firstPage = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.workspaceId, updatedWs.id), eq(pages.isDeleted, false)))
    .limit(1);

  const welcomePageId = firstPage[0]?.id;

  return {
    success: true,
    session: {
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      avatarUrl: updatedUser.avatarUrl,
      role: updatedUser.role,
      isOnboarded: true,
      workspaceId: updatedWs.id,
      workspaceName: updatedWs.name,
      workspaceSlug: updatedWs.slug,
      workspaceIcon: updatedWs.icon || '🚀',
      welcomePageId,
    },
  };
}

export async function updateSettingsImpl(data: {
  workspaceName?: string;
  workspaceSlug?: string;
  workspaceIcon?: string;
  name?: string;
  role?: string;
  avatarUrl?: string;
}): Promise<AuthResponse> {
  try {
    const currentSession = await getSessionImpl();
    if (!currentSession) {
      return { success: false, error: 'Unauthorized. Please sign in.' };
    }

    if (data.name !== undefined || data.role !== undefined || data.avatarUrl !== undefined) {
      await db
        .update(users)
        .set({
          ...(data.name !== undefined && { name: data.name }),
          ...(data.role !== undefined && { role: data.role }),
          ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        })
        .where(eq(users.id, currentSession.userId));
    }

    if (data.workspaceName !== undefined || data.workspaceIcon !== undefined || data.workspaceSlug !== undefined) {
      if (!currentSession.isWorkspaceOwner) {
        return { success: false, error: 'Only the workspace owner can modify workspace settings.' };
      }

      let finalSlug = undefined;
      if (data.workspaceSlug) {
        finalSlug = await generateUniqueWorkspaceSlug(data.workspaceSlug);
      }
      await db
        .update(workspaces)
        .set({
          ...(data.workspaceName !== undefined && { name: data.workspaceName }),
          ...(data.workspaceIcon !== undefined && { icon: data.workspaceIcon }),
          ...(finalSlug !== undefined && { slug: finalSlug }),
        })
        .where(eq(workspaces.id, currentSession.workspaceId));
    }

    const updatedSession = await getSessionImpl();
    return {
      success: true,
      session: updatedSession,
    };
  } catch (err: any) {
    return { success: false, error: sanitizeServerError(err, 'Failed to update settings.') };
  }
}

export async function signOutImpl(): Promise<{ success: boolean }> {
  try {
    const token = getCookie(COOKIE_NAME);
    if (token) {
      await db.delete(sessions).where(eq(sessions.token, token));
    }
  } catch (err) {
    console.error('Error signing out:', err);
  } finally {
    deleteCookie(COOKIE_NAME, { path: '/' });
    deleteCookie(ACTIVE_WS_COOKIE, { path: '/' });
  }
  return { success: true };
}

export async function deleteAccountAndDataImpl(): Promise<{ success: boolean; error?: string }> {
  try {
    const currentSession = await getSessionImpl();
    if (!currentSession) {
      deleteCookie(COOKIE_NAME, { path: '/' });
      deleteCookie(ACTIVE_WS_COOKIE, { path: '/' });
      return { success: false, error: 'Unauthorized.' };
    }

    const userId = currentSession.userId;
    const cleanEmail = currentSession.email ? currentSession.email.trim().toLowerCase() : null;

    // Delete user workspace member entries
    if (cleanEmail) {
      await db
        .delete(workspaceMembers)
        .where(or(eq(workspaceMembers.userId, userId), eq(workspaceMembers.email, cleanEmail)));
    } else {
      await db.delete(workspaceMembers).where(eq(workspaceMembers.userId, userId));
    }

    // Delete user uploads
    await db.delete(uploads).where(eq(uploads.userId, userId));

    // Delete workspaces owned by user (cascades to pages, shares, etc.)
    await db.delete(workspaces).where(eq(workspaces.ownerId, userId));

    // Delete all sessions for user
    await db.delete(sessions).where(eq(sessions.userId, userId));

    // Delete user record
    await db.delete(users).where(eq(users.id, userId));

    // Clear session cookies
    deleteCookie(COOKIE_NAME, { path: '/' });
    deleteCookie(ACTIVE_WS_COOKIE, { path: '/' });

    return { success: true };
  } catch (err: any) {
    deleteCookie(COOKIE_NAME, { path: '/' });
    deleteCookie(ACTIVE_WS_COOKIE, { path: '/' });
    return { success: false, error: sanitizeServerError(err, 'Failed to delete account.') };
  }
}

export async function deleteWorkspaceImpl(workspaceIdInput?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentSession = await getSessionImpl();
    if (!currentSession) {
      return { success: false, error: 'Unauthorized.' };
    }

    const targetWorkspaceId = workspaceIdInput || currentSession.workspaceId;
    if (!targetWorkspaceId) {
      return { success: false, error: 'No workspace specified.' };
    }

    // Verify workspace existence and ownership
    const targetWs = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, targetWorkspaceId))
      .limit(1);

    if (targetWs.length === 0) {
      return { success: false, error: 'Workspace not found.' };
    }

    if (targetWs[0].ownerId !== currentSession.userId) {
      return { success: false, error: 'Only the workspace owner can delete this workspace.' };
    }

    // Delete workspace (cascades to pages, pageShares, pagePresence via DB foreign keys)
    await db.delete(workspaces).where(eq(workspaces.id, targetWorkspaceId));

    // Clear active workspace cookie if deleting current active workspace
    const activeWsCookie = getCookie(ACTIVE_WS_COOKIE);
    if (!activeWsCookie || activeWsCookie === targetWorkspaceId) {
      deleteCookie(ACTIVE_WS_COOKIE, { path: '/' });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: sanitizeServerError(err, 'Failed to delete workspace.') };
  }
}

