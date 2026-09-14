import React from 'react';

interface DistortedGlassProps {
  className?: string;
  children?: React.ReactNode;
}

export const DistortedGlass: React.FC<DistortedGlassProps> = ({
  className = '',
  children,
}) => {
  return (
    <>
      <div className={`relative overflow-hidden ${className}`}>
        {/* Glass Effect Overlay */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden border border-[#f5f5f51a]">
          <div
            className="w-full h-full"
            style={{
              background: `repeating-radial-gradient(
                circle at 50% 50%,
                rgba(255, 255, 255, 0),
                rgba(255, 255, 255, 0.2) 10px,
                rgb(255, 255, 255) 31px
              )`,
              filter: 'url(#fractal-noise-glass)',
              backgroundSize: '6px 6px',
              backdropFilter: 'blur(0px)',
            }}
          />
        </div>

        {/* SVG Filter definition */}
        <svg className="absolute w-0 h-0 pointer-events-none opacity-0" aria-hidden="true">
          <defs>
            <filter id="fractal-noise-glass">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.12 0.12"
                numOctaves="1"
                result="warp"
              />
              <feDisplacementMap
                xChannelSelector="R"
                yChannelSelector="G"
                scale="30"
                in="SourceGraphic"
                in2="warp"
              />
            </filter>
          </defs>
        </svg>

        {/* Content */}
        <div className="relative z-10 w-full h-full flex items-center justify-between">
          {children}
        </div>
      </div>
    </>
  );
};
