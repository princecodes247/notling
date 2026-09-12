import { createRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { getOAuthUrl } from '~/server/auth';
import { Route as rootRoute } from './__root';
import { NotlingLogoIcon } from '~/components/Icons';

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
    } catch {}
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
    <div className="min-h-screen w-full bg-[#fbfbfb] text-neutral-900 flex flex-col items-center justify-center p-6 select-none font-sans antialiased relative overflow-hidden">
      {/* Delicate dot grid backdrop */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Main Minimalist Auth Card */}
      <div className="w-full max-w-[380px] bg-white border border-neutral-200/80 rounded-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center relative z-10">
        {/* Brand Icon */}
        <a href="/" className="w-10 h-10 rounded-lg bg-neutral-950 text-white flex items-center justify-center mb-5 shadow-2xs hover:bg-neutral-800 transition-colors">
          <NotlingLogoIcon className="w-5 h-5" />
        </a>

        {/* Title & Subtitle */}
        <h1 className="text-xl font-semibold text-neutral-950 tracking-tight text-center">
          Sign in to Notling
        </h1>
        <p className="text-xs text-neutral-500 text-center mt-1 mb-7 leading-relaxed">
          Choose an authentication provider to continue
        </p>

        {error && (
          <div className="w-full mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          {/* Google Button */}
          <button
            type="button"
            disabled={!!loadingProvider}
            onClick={() => handleRealOAuth('google')}
            className="w-full h-10 flex items-center justify-center gap-2.5 px-4 bg-white hover:bg-neutral-50 text-neutral-800 rounded-lg border border-neutral-200/90 font-medium text-xs transition-all cursor-pointer shadow-2xs active:scale-[0.985] disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loadingProvider === 'google' ? 'Connecting...' : 'Continue with Google'}</span>
          </button>

          {/* GitHub Button */}
          <button
            type="button"
            disabled={!!loadingProvider}
            onClick={() => handleRealOAuth('github')}
            className="w-full h-10 flex items-center justify-center gap-2.5 px-4 bg-neutral-950 hover:bg-neutral-800 text-white rounded-lg font-medium text-xs transition-all cursor-pointer shadow-2xs active:scale-[0.985] disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>{loadingProvider === 'github' ? 'Connecting...' : 'Continue with GitHub'}</span>
          </button>
        </div>

        {/* Footer info */}
        <p className="mt-8 pt-5 border-t border-neutral-100 w-full text-center text-[11px] text-neutral-400 leading-normal font-normal">
          By continuing, you agree to Notling's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
