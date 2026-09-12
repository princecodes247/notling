import React, { useMemo } from 'react';

export interface WorkspaceAvatarProps {
  seed?: string | null;
  slug?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
  showReroll?: boolean;
  onReroll?: () => void;
}

const RING_PALETTES = [
  // 1. Obsidian Gold & Amber
  { bg: '#1c1917', rings: ['#f59e0b', '#fbbf24', '#d97706', '#fef3c7', '#78350f'] },
  // 2. Cyan & Teal Synth
  { bg: '#0f172a', rings: ['#06b6d4', '#22d3ee', '#0891b2', '#cff4fc', '#155e75'] },
  // 3. Neon Sunset Rose
  { bg: '#18181b', rings: ['#ec4899', '#f472b6', '#a855f7', '#c084fc', '#831843'] },
  // 4. Emerald Mint
  { bg: '#064e3b', rings: ['#10b981', '#34d399', '#059669', '#a7f3d0', '#022c22'] },
  // 5. Indigo Pulse
  { bg: '#1e1b4b', rings: ['#6366f1', '#818cf8', '#4338ca', '#e0e7ff', '#312e81'] },
  // 6. Solar Orange
  { bg: '#451a03', rings: ['#f97316', '#fb923c', '#ea580c', '#ffedd5', '#7c2d12'] },
  // 7. Cosmic Midnight
  { bg: '#09090b', rings: ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fef08a'] },
  // 8. Forest Sage
  { bg: '#14532d', rings: ['#86efac', '#4ade80', '#22c55e', '#dcfce7', '#166534'] },
  // 9. Amethyst Dream
  { bg: '#3b0764', rings: ['#d8b4fe', '#c084fc', '#a855f7', '#f3e8ff', '#581c87'] },
  // 10. Cyber Tangerine
  { bg: '#292524', rings: ['#facc15', '#f87171', '#fb923c', '#fef08a', '#991b1b'] },
];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function createRng(seedNum: number) {
  let s = seedNum;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export const WorkspaceAvatar: React.FC<WorkspaceAvatarProps> = ({
  seed,
  slug,
  name,
  size = 32,
  className = '',
  showReroll = false,
  onReroll,
}) => {
  const effectiveSeed = seed || slug || name || 'default-workspace';

  const avatarData = useMemo(() => {
    const numericHash = hashSeed(effectiveSeed);
    const rng = createRng(numericHash);

    const paletteIndex = numericHash % RING_PALETTES.length;
    const palette = RING_PALETTES[paletteIndex];

    // Generate 4 to 6 rings
    const ringCount = 4 + Math.floor(rng() * 3);
    const rings = [];

    const radii = [10, 18, 26, 34, 42, 48];

    for (let i = 0; i < ringCount; i++) {
      const colorIndex = Math.floor(rng() * palette.rings.length);
      const color = palette.rings[colorIndex];
      const radius = radii[i % radii.length] + (rng() * 4 - 2);
      const strokeWidth = 1.5 + rng() * 3.5;
      const offsetX = (rng() - 0.5) * 6;
      const offsetY = (rng() - 0.5) * 6;
      const opacity = 0.5 + rng() * 0.45;

      const dashTypes = [
        'none',
        '3 3',
        '8 4',
        '14 6',
        '20 8 4 8',
      ];
      const strokeDasharray = dashTypes[Math.floor(rng() * dashTypes.length)];
      const rotation = Math.floor(rng() * 360);

      // Accent dot on ring path
      const angleRad = (rng() * 360 * Math.PI) / 180;
      const dotX = 50 + offsetX + Math.cos(angleRad) * radius;
      const dotY = 50 + offsetY + Math.sin(angleRad) * radius;
      const dotSize = 1.5 + rng() * 2;

      rings.push({
        id: `ring-${i}`,
        color,
        radius,
        strokeWidth,
        cx: 50 + offsetX,
        cy: 50 + offsetY,
        opacity,
        strokeDasharray,
        rotation,
        hasDot: rng() > 0.4,
        dotX,
        dotY,
        dotSize,
        dotColor: palette.rings[(colorIndex + 1) % palette.rings.length],
      });
    }

    const centerDotRadius = 3 + rng() * 4;
    const centerColor = palette.rings[Math.floor(rng() * palette.rings.length)];

    return {
      bg: palette.bg,
      rings,
      centerDotRadius,
      centerColor,
    };
  }, [effectiveSeed]);

  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`relative rounded-lg overflow-hidden shrink-0 inline-flex items-center justify-center shadow-2xs ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full object-cover"
        style={{ borderRadius: 'inherit' }}
      >
        <rect width="100" height="100" fill={avatarData.bg} />
        <g>
          {avatarData.rings.map((ring) => (
            <React.Fragment key={ring.id}>
              <circle
                cx={ring.cx}
                cy={ring.cy}
                r={ring.radius}
                fill="none"
                stroke={ring.color}
                strokeWidth={ring.strokeWidth}
                strokeDasharray={ring.strokeDasharray !== 'none' ? ring.strokeDasharray : undefined}
                opacity={ring.opacity}
                transform={`rotate(${ring.rotation} 50 50)`}
              />
              {ring.hasDot && (
                <circle
                  cx={ring.dotX}
                  cy={ring.dotY}
                  r={ring.dotSize}
                  fill={ring.dotColor}
                  opacity={ring.opacity + 0.1}
                />
              )}
            </React.Fragment>
          ))}

          {/* Core Center Orb */}
          <circle cx="50" cy="50" r={avatarData.centerDotRadius} fill={avatarData.centerColor} />
          <circle cx="50" cy="50" r={avatarData.centerDotRadius * 1.8} fill={avatarData.centerColor} opacity="0.25" />
        </g>
      </svg>

      {showReroll && onReroll && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReroll();
          }}
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white hover:bg-stone-100 border border-stone-300 text-stone-600 flex items-center justify-center shadow-2xs cursor-pointer transition-all active:scale-90"
          title="Reroll rings avatar"
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
        </button>
      )}
    </div>
  );
};
