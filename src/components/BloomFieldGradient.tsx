import React, { useEffect, useRef } from 'react';

const NOISE_SVG = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.500'/></svg>`;

interface BlobSpec {
  baseX: number;
  baseY: number;
  p: number;
  p2: number;
  colorStops: string;
}

const BLOBS: BlobSpec[] = [
  {
    baseX: 67.04,
    baseY: 45.93,
    p: 0.85,
    p2: 2.14,
    colorStops:
      'rgba(235, 246, 247, 1) 0%, rgba(235, 246, 247, 0.844) 19.02%, rgba(235, 246, 247, 0.5) 38.05%, rgba(235, 246, 247, 0.156) 57.07%, rgba(235, 246, 247, 0) 76.1%',
  },
  {
    baseX: 35.47,
    baseY: 65.92,
    p: 3.42,
    p2: 1.18,
    colorStops:
      'rgba(162, 215, 221, 1) 0%, rgba(162, 215, 221, 0.844) 12.03%, rgba(162, 215, 221, 0.5) 24.05%, rgba(162, 215, 221, 0.156) 36.08%, rgba(162, 215, 221, 0) 48.1%',
  },
  {
    baseX: 48.33,
    baseY: 20.11,
    p: 1.76,
    p2: 4.89,
    colorStops:
      'rgba(0, 163, 175, 1) 0%, rgba(0, 163, 175, 0.844) 16.75%, rgba(0, 163, 175, 0.5) 33.5%, rgba(0, 163, 175, 0.156) 50.25%, rgba(0, 163, 175, 0) 67%',
  },
  {
    baseX: 80.81,
    baseY: 88.03,
    p: 5.12,
    p2: 0.63,
    colorStops:
      'rgba(39, 74, 120, 1) 0%, rgba(39, 74, 120, 0.844) 10.28%, rgba(39, 74, 120, 0.5) 20.55%, rgba(39, 74, 120, 0.156) 30.83%, rgba(39, 74, 120, 0) 41.1%',
  },
];

interface BloomFieldGradientProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const BloomFieldGradient: React.FC<BloomFieldGradientProps> = ({
  children,
  className = '',
  style = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animId: number;
    const startTime = performance.now();

    const updateGradient = (now: number) => {
      if (!containerRef.current) return;

      const elapsedSec = (now - startTime) / 1000;
      const ph = elapsedSec * 1.0;
      const amt = 1.0;

      const radialGradients = BLOBS.map((blob) => {
        const dx = (Math.sin(ph * 0.55 + blob.p) - Math.sin(blob.p)) * 14 * amt;
        const dy = (Math.sin(ph * 0.43 + blob.p2) - Math.sin(blob.p2)) * 14 * amt;
        const currentX = blob.baseX + dx;
        const currentY = blob.baseY + dy;

        return `radial-gradient(circle at ${currentX}% ${currentY}%, ${blob.colorStops})`;
      });

      const bgImage = `url("${NOISE_SVG}"), ${radialGradients.join(', ')}`;
      containerRef.current.style.backgroundImage = bgImage;

      animId = requestAnimationFrame(updateGradient);
    };

    animId = requestAnimationFrame(updateGradient);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        backgroundColor: '#EBF6F7',
        backgroundImage: `url("${NOISE_SVG}"), ${BLOBS.map(
          (b) => `radial-gradient(circle at ${b.baseX}% ${b.baseY}%, ${b.colorStops})`
        ).join(', ')}`,
        backgroundSize: '120px 120px, auto, auto, auto, auto',
        backgroundBlendMode: 'overlay, normal, normal, normal, normal',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
