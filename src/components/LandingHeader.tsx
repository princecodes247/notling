import React from 'react';
import { NotlingLogoIcon } from './Icons';
import { DistortedGlass } from './DistortedGlass';
import { Link } from '@tanstack/react-router';
import type { SessionData } from '~/lib/types';

interface LandingHeaderProps {
  onEnterApp?: () => void;
  className?: string;
  session?: SessionData | null;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  onEnterApp,
  className = '',
  session,
}) => {
  const isLoggedIn = !!session;

  return (
    <header className={`sticky top-0 z-50 px-0 h-14 flex ${className}`}>
      <div className="border-b-2 border-r-2 border-gray-300/30 p-1 sm:p-5 bg-white/40" />
      <DistortedGlass className="px-3 sm:px-8 md:px-14 flex items-center justify-between border-b-2 border-gray-300/30 w-full bg-white/50">
        {/* Brand */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={onEnterApp}
        >
          <NotlingLogoIcon className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-brand-600 drop-shadow-2xs" />
          <span className="font-bold text-sm sm:text-base tracking-tight text-neutral-900">
            Notling
          </span>
        </div>

        {/* Right Links */}
        <div className="flex items-center gap-3 sm:gap-4">
          {isLoggedIn ? (
            <Link
              to="/dashboard"
              type="button"
              className="bg-brand-600 hover:bg-brand-700 text-white text-[11px] sm:text-xs font-medium px-3.5 py-1.5 sm:px-4 sm:py-2 rounded transition-all duration-150 shadow-2xs hover:shadow-xs cursor-pointer active-press flex items-center gap-1.5"
            >
              <span>Go to Workspace</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/login"
                className="text-neutral-700 hover:text-neutral-950 text-[11px] sm:text-xs font-medium px-2.5 py-1.5 rounded hover:bg-neutral-100 transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/login"
                className="bg-brand-600 hover:bg-brand-700 text-white text-[11px] sm:text-xs font-medium px-3.5 py-1.5 sm:px-4 sm:py-2 rounded transition-all duration-150 shadow-2xs hover:shadow-xs cursor-pointer active-press"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </DistortedGlass>
      <div className="border-b-2 border-l-2 border-gray-300/30 p-1 sm:p-5 bg-white/40" />
    </header>
  );
};

export default LandingHeader;

