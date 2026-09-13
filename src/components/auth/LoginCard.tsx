import React from 'react';
import { NotlingLogoIcon } from '~/components/Icons';

interface LoginCardProps {
  error: string | null;
  children: React.ReactNode;
}

export function LoginCard({ error, children }: LoginCardProps) {
  return (
    <div className="w-full max-w-[380px] bg-white border border-neutral-200/80 rounded-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center relative z-10">
      {/* Brand Icon */}
      <a
        href="/"
        className="w-10 h-10 rounded-lg bg-neutral-950 text-white flex items-center justify-center mb-5 shadow-2xs hover:bg-neutral-800 transition-colors"
      >
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

      {children}

      {/* Footer info */}
      <p className="mt-8 pt-5 border-t border-neutral-100 w-full text-center text-[11px] text-neutral-400 leading-normal font-normal">
        By continuing, you agree to Notling's Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
