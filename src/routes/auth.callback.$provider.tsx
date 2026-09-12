import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { processOAuthCallback } from '~/server/auth';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';

export const Route = createFileRoute('/auth/callback/$provider')({
  component: OAuthCallbackPage,
});

function OAuthCallbackPage() {
  const { provider } = Route.useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function runCallback() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (!code) {
        setError('Missing OAuth authorization code in callback URL.');
        return;
      }

      const redirectUri = `${url.origin}/auth/callback/${provider}`;
      const res = await processOAuthCallback({
        data: {
          provider: provider as 'google' | 'github',
          code,
          redirectUri,
        },
      });

      if (res.success && res.session) {
        const returnUrl = sessionStorage.getItem('notling_auth_redirect');
        if (!res.session.isOnboarded) {
          navigate({ to: '/onboarding' });
        } else {
          sessionStorage.removeItem('notling_auth_redirect');
          if (returnUrl) {
            window.location.href = returnUrl;
          } else {
            navigate({ to: '/dashboard' });
          }
        }
      } else {
        setError(res.error || 'Failed to complete OAuth login.');
      }
    }

    runCallback();
  }, [provider, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#fafaf9] text-neutral-900 flex flex-col items-center justify-center p-6 select-none font-sans">
        <div className="w-full max-w-md bg-white border border-neutral-200 rounded-xl p-8 shadow-xs flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
            <HugeiconsIcon icon={Cancel01Icon} size={24} />
          </div>
          <h2 className="text-xl font-semibold text-neutral-950 mb-2">OAuth Authentication Error</h2>
          <p className="text-xs text-neutral-500 mb-6 leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => navigate({ to: '/login' })}
            className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] text-neutral-900 flex flex-col items-center justify-center p-6 select-none font-sans">
      <div className="flex flex-col items-center gap-3">
        <HugeiconsIcon icon={Loading02Icon} size={32} className="animate-spin text-neutral-700" />
        <span className="text-sm font-medium text-neutral-700">Completing {provider} sign in...</span>
      </div>
    </div>
  );
}
