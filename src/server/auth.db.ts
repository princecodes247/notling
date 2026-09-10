import { db } from '~/db';
import { users, workspaces, sessions, pages } from '~/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import type { UserSession, AuthResponse } from './auth';
import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server';
import crypto from 'node:crypto';

const COOKIE_NAME = 'notling_session';
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
    maxAge: SESSION_MAX_AGE,
  });

  return token;
}

export async function getSessionImpl(): Promise<UserSession | null> {
  try {
    const token = getCookie(COOKIE_NAME);
    if (!token) {
      return null;
    }

    const activeSession = await db
      .select({
        session: sessions,
        user: users,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);

    if (!activeSession || activeSession.length === 0) {
      deleteCookie(COOKIE_NAME);
      return null;
    }

    const { user } = activeSession[0];

    // Find owner's workspace
    const userWorkspaces = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerId, user.id))
      .limit(1);

    let workspace = userWorkspaces[0];
    if (!workspace) {
      const [newWs] = await db
        .insert(workspaces)
        .values({
          ownerId: user.id,
          name: `${user.name || 'Personal'}'s Workspace`,
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
      workspaceIcon: workspace.icon || '🚀',
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
  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`;

  const [user] = await db
    .insert(users)
    .values({
      email: cleanEmail,
      name: displayName,
      avatarUrl,
      passwordHash: hash,
      provider: 'email',
      providerAccountId: cleanEmail,
      isOnboarded: false,
    })
    .returning();

  const [workspace] = await db
    .insert(workspaces)
    .values({
      ownerId: user.id,
      name: `${displayName}'s Workspace`,
      icon: '🚀',
    })
    .returning();

  await createSessionAndCookie(user.id);

  return {
    success: true,
    session: {
      userId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isOnboarded: false,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceIcon: workspace.icon || '🚀',
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
    const [newWs] = await db
      .insert(workspaces)
      .values({
        ownerId: user.id,
        name: `${user.name || 'User'}'s Workspace`,
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

    if (!user) {
      const [newUser] = await db
        .insert(users)
        .values({
          email: cleanEmail,
          name: name || cleanEmail.split('@')[0],
          avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`,
          provider,
          providerAccountId,
          isOnboarded: false,
        })
        .returning();
      user = newUser;
    }

    let existingWs = await db.select().from(workspaces).where(eq(workspaces.ownerId, user.id)).limit(1);
    let workspace = existingWs[0];

    if (!workspace) {
      const [newWs] = await db
        .insert(workspaces)
        .values({
          ownerId: user.id,
          name: `${user.name || 'User'}'s Workspace`,
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
        workspaceIcon: workspace.icon || '🚀',
      },
    };
  } catch (err: any) {
    console.error('OAuth callback error:', err);
    return { success: false, error: err.message || 'OAuth authentication failed.' };
  }
}

export async function completeOnboardingImpl(data: {
  name: string;
  avatarUrl?: string;
  role?: string;
  workspaceName: string;
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

  // Update workspace
  const [updatedWs] = await db
    .update(workspaces)
    .set({
      name: data.workspaceName || `${data.name}'s Workspace`,
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
      workspaceIcon: updatedWs.icon || '🚀',
    },
  };
}

export async function signOutImpl(): Promise<{ success: boolean }> {
  try {
    const token = getCookie(COOKIE_NAME);
    if (token) {
      await db.delete(sessions).where(eq(sessions.token, token));
      deleteCookie(COOKIE_NAME);
    }
    return { success: true };
  } catch (err) {
    console.error('Error signing out:', err);
    deleteCookie(COOKIE_NAME);
    return { success: true };
  }
}
