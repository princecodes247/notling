import { createRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { getOAuthUrl } from '~/server/auth';
import { Route as rootRoute } from './__root';
import { LoginCard } from '~/components/auth/LoginCard';
import { OAuthButtons } from '~/components/auth/OAuthButtons';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      if (redirect) {
        sessionStorage.setItem('notling_auth_redirect', redirect);
      }
    } catch { }
  }, []);

  const handleRealOAuth = async (provider: 'google' | 'github') => {
    setLoadingProvider(provider);
    setError(null);
    try {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      if (redirect) {
        sessionStorage.setItem('notling_auth_redirect', redirect);
      }

      const redirectUri = `${window.location.origin}/auth/callback/${provider}`;
      const { url } = await getOAuthUrl({ data: { provider, redirectUri } });
      window.location.href = url;
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to initialize OAuth authorization.');
      setLoadingProvider(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col items-center justify-center p-6 select-none font-sans antialiased relative overflow-hidden transition-colors duration-200">
      {/* Delicate dot grid backdrop */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60 dark:opacity-40"
        style={{
          backgroundImage: 'radial-gradient(var(--border-color, #e5e7eb) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <LoginCard error={error}>
        <OAuthButtons loadingProvider={loadingProvider} onOAuth={handleRealOAuth} />
      </LoginCard>
    </div>
  );
}

