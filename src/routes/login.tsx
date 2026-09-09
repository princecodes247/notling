import { createRoute, useNavigate } from '@tanstack/react-router';
import React from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { loginWithOAuth } from '~/server/auth';
import { Route as rootRoute } from './__root';
import { DanceLogoIcon } from '~/components/Icons';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();

  const handleLogin = async (provider: 'google' | 'github' | 'dev') => {
    await loginWithOAuth({ data: provider });
    navigate({ to: '/dashboard' });
  };

  return (
    <div className="min-h-screen bg-[#eef2f6] text-neutral-900 flex flex-col items-center justify-center p-6 relative select-none font-sans">
      {/* Top Brand Link */}
      <a href="/" className="mb-8 flex items-center gap-2 text-neutral-900 group">
        <DanceLogoIcon className="w-6 h-6 text-neutral-900" />
        <span className="font-bold text-lg tracking-tight">Dance</span>
        <span className="text-xs text-neutral-400 pl-1 border-l border-neutral-300">Notling</span>
      </a>

      {/* Login Card */}
      <div className="w-full max-w-sm bg-white border border-neutral-200/90 rounded-2xl p-8 shadow-sm flex flex-col items-center">
        <h1 className="text-2xl font-normal text-neutral-950 tracking-tight mb-2 text-center">
          Sign in to your workspace
        </h1>
        <p className="text-xs text-neutral-500 text-center mb-6 leading-relaxed">
          Access your documents, notes, and collaborative workspace.
        </p>

        {/* OAuth Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          {/* Google Login */}
          <button
            type="button"
            onClick={() => handleLogin('google')}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white hover:bg-neutral-50 text-neutral-800 rounded-lg border border-neutral-200 font-medium text-xs transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
            <span>Continue with Google</span>
          </button>

          {/* Direct Workspace Access (Dev / Demo) */}
          <button
            type="button"
            onClick={() => handleLogin('dev')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-black hover:bg-neutral-800 text-white font-medium rounded-lg text-xs transition-colors shadow-2xs cursor-pointer mt-1"
          >
            <span>Enter Demo Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Feature bullets */}
        <div className="mt-8 pt-6 border-t border-neutral-100 w-full flex flex-col gap-2 text-[11px] text-neutral-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
            <span>Fast, local-first Postgres storage</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
            <span>Full-text search across all documents</span>
          </div>
        </div>
      </div>
    </div>
  );
}
