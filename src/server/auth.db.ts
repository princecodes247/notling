import { db } from '~/db';
import { users, workspaces } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { getOrCreateDefaultWorkspace } from './pages.db';
import type { UserSession } from './auth';

export async function getSessionImpl(): Promise<UserSession> {
  const { user, workspace } = await getOrCreateDefaultWorkspace();

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    workspaceId: workspace.id,
  };
}

export async function loginWithOAuthImpl(provider: 'google' | 'github' | 'dev'): Promise<UserSession> {
  const email = provider === 'google' 
    ? 'user.google@notling.dev' 
    : provider === 'github' 
    ? 'user.github@notling.dev' 
    : 'demo@notling.dev';
  
  const name = provider === 'google' 
    ? 'Google User' 
    : provider === 'github' 
    ? 'GitHub User' 
    : 'Prince (Workspace Owner)';

  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;

  let existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let user = existingUser[0];

  if (!user) {
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name,
        avatarUrl,
        provider,
        providerAccountId: `${provider}-${Date.now()}`,
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
      })
      .returning();
    workspace = newWs;
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    workspaceId: workspace.id,
  };
}
