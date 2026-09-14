import React from 'react';
import { NotlingLogoIcon } from './Icons';
import { DistortedGlass } from './DistortedGlass';

interface LandingHeaderProps {
  onEnterApp?: () => void;
  className?: string;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  onEnterApp,
  className = '',
}) => {
  return (
    <header className={`sticky top-0 z-50 px-0 h-14 flex ${className}`}>
      <div className="border-b-2 border-r-2 border-gray-300/30 p-5 bg-white/40" />
      <DistortedGlass className="px-14 flex items-center justify-between border-b-2 border-gray-300/30 w-full bg-white/50">
        {/* Brand */}
        <div
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={onEnterApp}
        >
          <NotlingLogoIcon className="w-5 h-5 text-brand-600 drop-shadow-2xs" />
          <span className="font-bold text-base tracking-tight text-neutral-900">
            Notling
          </span>
        </div>

        {/* Right Links */}
        <div className="flex items-center gap-6 sm:gap-8">
          {/* Brand Pill Button */}
          <button
            type="button"
            onClick={onEnterApp}
            className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium px-4 py-2 rounded-full transition-all duration-150 shadow-2xs hover:shadow-xs cursor-pointer active-press"
          >
            Get Started
          </button>
        </div>
      </DistortedGlass>
      <div className="border-b-2 border-l-2 border-gray-300/30 p-5 bg-white/40" />
    </header>
  );
};

export default LandingHeader;
