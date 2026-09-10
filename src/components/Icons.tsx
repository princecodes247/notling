import React from 'react';

export const NotlingLogoIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Dynamic Origami mark */}
    <path
      d="M3 13.5C3 13.5 5 11 8 11C11 11 12.5 13.5 15.5 13.5C18.5 13.5 21 11 21 11"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 4L15.5 13.5L8 11L12 4Z"
      fill="currentColor"
      fillOpacity="0.12"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle cx="6.5" cy="7.5" r="2" fill="currentColor" />
  </svg>
);

export const DanceLogoIcon = NotlingLogoIcon;

export const PanelCollapseIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M9 3V21" />
  </svg>
);
