import { createServerFn } from '@tanstack/react-start';

export interface UserSession {
  userId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string | null;
  isOnboarded: boolean;
  workspaceId: string;
  workspaceName?: string;
  workspaceSlug?: string;
  workspaceIcon?: string;
  welcomePageId?: string;
  isWorkspaceOwner?: boolean;
}

export interface UserWorkspaceItem {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  role: 'owner' | 'member';
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  session?: UserSession | null;
}

// Get current user session from HTTP-only cookie
export const getSession = createServerFn({ method: 'GET' }).handler(async (): Promise<UserSession | null> => {
  const { getSessionImpl } = await import('./auth.db');
  return getSessionImpl();
});

// Email/Password Sign Up
export const signUpWithEmail = createServerFn({ method: 'POST' })
  .validator((data: { email: string; password: string; name?: string }) => data)
  .handler(async ({ data }): Promise<AuthResponse> => {
    const { signUpWithEmailImpl } = await import('./auth.db');
    return signUpWithEmailImpl(data.email, data.password, data.name);
  });

// Email/Password Sign In
export const signInWithEmail = createServerFn({ method: 'POST' })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }): Promise<AuthResponse> => {
    const { signInWithEmailImpl } = await import('./auth.db');
    return signInWithEmailImpl(data.email, data.password);
  });

// Get real OAuth Redirect URL
export const getOAuthUrl = createServerFn({ method: 'POST' })
  .validator((data: { provider: 'google' | 'github'; redirectUri: string }) => data)
  .handler(async ({ data }): Promise<{ url: string }> => {
    const { getOAuthUrlImpl } = await import('./auth.db');
    return getOAuthUrlImpl(data.provider, data.redirectUri);
  });

// Process real OAuth Callback code
export const processOAuthCallback = createServerFn({ method: 'POST' })
  .validator((data: { provider: 'google' | 'github'; code: string; redirectUri: string }) => data)
  .handler(async ({ data }): Promise<AuthResponse> => {
    const { processOAuthCallbackImpl } = await import('./auth.db');
    return processOAuthCallbackImpl(data.provider, data.code, data.redirectUri);
  });

// Complete User Onboarding
export const completeOnboarding = createServerFn({ method: 'POST' })
  .validator((data: {
    name: string;
    avatarUrl?: string;
    role?: string;
    workspaceName: string;
    workspaceSlug?: string;
    workspaceIcon?: string;
    workspaceDescription?: string;
    templateId?: string;
  }) => data)
  .handler(async ({ data }): Promise<AuthResponse> => {
    const { completeOnboardingImpl } = await import('./auth.db');
    return completeOnboardingImpl(data);
  });

// Update Workspace and User Settings
export const updateSettings = createServerFn({ method: 'POST' })
  .validator((data: {
    workspaceName?: string;
    workspaceSlug?: string;
    workspaceIcon?: string;
    name?: string;
    role?: string;
    avatarUrl?: string;
  }) => data)
  .handler(async ({ data }): Promise<AuthResponse> => {
    const { updateSettingsImpl } = await import('./auth.db');
    return updateSettingsImpl(data);
  });

// Check Workspace Slug Availability & Uniqueness
export const checkWorkspaceSlug = createServerFn({ method: 'POST' })
  .validator((data: { slug: string; excludeWorkspaceId?: string }) => data)
  .handler(async ({ data }): Promise<{ isAvailable: boolean; candidateSlug: string; cleanSlug: string }> => {
    const { checkWorkspaceSlugImpl } = await import('./auth.db');
    return checkWorkspaceSlugImpl(data);
  });

// Get all accessible user workspaces
export const getUserWorkspaces = createServerFn({ method: 'GET' }).handler(async (): Promise<UserWorkspaceItem[]> => {
  const { getUserWorkspacesImpl } = await import('./auth.db');
  return getUserWorkspacesImpl();
});

// Switch active workspace
export const switchWorkspace = createServerFn({ method: 'POST' })
  .validator((data: { workspaceId: string }) => data)
  .handler(async ({ data }): Promise<AuthResponse> => {
    const { switchWorkspaceImpl } = await import('./auth.db');
    return switchWorkspaceImpl(data.workspaceId);
  });

// Switch active workspace by slug
export const switchWorkspaceBySlug = createServerFn({ method: 'POST' })
  .validator((data: { slug: string }) => data)
  .handler(async ({ data }): Promise<AuthResponse> => {
    const { switchWorkspaceBySlugImpl } = await import('./auth.db');
    return switchWorkspaceBySlugImpl(data.slug);
  });

// Create new workspace
export const createWorkspace = createServerFn({ method: 'POST' })
  .validator((data: { name: string; icon?: string; description?: string }) => data)
  .handler(async ({ data }): Promise<AuthResponse> => {
    const { createWorkspaceImpl } = await import('./auth.db');
    return createWorkspaceImpl(data);
  });

// Sign Out
export const signOut = createServerFn({ method: 'POST' }).handler(async (): Promise<{ success: boolean }> => {
  const { signOutImpl } = await import('./auth.db');
  return signOutImpl();
});

// Delete Account & All Data
export const deleteAccount = createServerFn({ method: 'POST' }).handler(async (): Promise<{ success: boolean; error?: string }> => {
  const { deleteAccountAndDataImpl } = await import('./auth.db');
  return deleteAccountAndDataImpl();
});

// Delete Single Workspace
export const deleteWorkspace = createServerFn({ method: 'POST' })
  .validator((data?: { workspaceId?: string }) => data)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const { deleteWorkspaceImpl } = await import('./auth.db');
    return deleteWorkspaceImpl(data?.workspaceId);
  });

