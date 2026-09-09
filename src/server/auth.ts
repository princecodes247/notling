import { createServerFn } from '@tanstack/react-start';

export interface UserSession {
  userId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  workspaceId: string;
}

// Get active session or fallback to default workspace user for seamless experience
export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const { getSessionImpl } = await import('./auth.db');
  return getSessionImpl();
});

// OAuth Login Trigger / Provider Simulation
export const loginWithOAuth = createServerFn({ method: 'POST' })
  .validator((provider: 'google' | 'github' | 'dev') => provider)
  .handler(async ({ data }: { data: 'google' | 'github' | 'dev' }) => {
    const { loginWithOAuthImpl } = await import('./auth.db');
    return loginWithOAuthImpl(data);
  });
