import { useRef, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { NotlingLogoIcon } from './Icons';
import { Github, ArrowUp } from 'lucide-react';
import { COMMON_LINKS } from '#/lib/constants';

interface WavePulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
}

export function Footer() {
  const currentYear = new Date().getFullYear();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);
  const feImageRef = useRef<SVGFEImageElement>(null);

  // Unique filter ID to avoid conflicts
  const [filterId] = useState(() => `water-ripple-${Math.random().toString(36).substring(2, 9)}`);

  const wavesRef = useRef<WavePulse[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Mouse move: Spawn localized water wave pulse at cursor position
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lastWave = wavesRef.current[wavesRef.current.length - 1];
    if (!lastWave || Math.hypot(lastWave.x - x, lastWave.y - y) > 16) {
      wavesRef.current.push({
        x,
        y,
        radius: 4,
        maxRadius: Math.random() * 40 + 75,
        opacity: 0.95,
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // High-performance liquid displacement loop (0 React re-renders)
  useEffect(() => {
    // Create offscreen heightmap canvas (low-res for speed & performance)
    const mapCanvas = document.createElement('canvas');
    mapCanvas.width = 320;
    mapCanvas.height = 90;
    mapCanvasRef.current = mapCanvas;
    const ctx = mapCanvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.02;

      // 1. Continuous Organic Multi-Harmonic Ambient Water Motion (Natural & Non-Repetitive)
      const freqX = 0.006 + Math.sin(time * 0.4) * 0.002 + Math.cos(time * 0.9) * 0.0015;
      const freqY = 0.016 + Math.cos(time * 0.5) * 0.004 + Math.sin(time * 1.1) * 0.0025;

      if (turbulenceRef.current) {
        turbulenceRef.current.setAttribute('baseFrequency', `${freqX.toFixed(4)} ${freqY.toFixed(4)}`);
      }

      // 2. Render Localized Radial Displacement Map around Cursor
      const width = mapCanvas.width;
      const height = mapCanvas.height;

      // Fill with neutral baseline (rgb 128, 128, 0 = 0 displacement)
      ctx.fillStyle = 'rgb(128, 128, 0)';
      ctx.fillRect(0, 0, width, height);

      // Scale cursor coordinates from container size to mapCanvas size
      let containerWidth = 1000;
      let containerHeight = 150;
      if (containerRef.current) {
        const bounds = containerRef.current.getBoundingClientRect();
        containerWidth = bounds.width || 1000;
        containerHeight = bounds.height || 150;
      }

      const activeWaves: WavePulse[] = [];

      for (const w of wavesRef.current) {
        w.radius += 1.8;
        w.opacity *= 0.955;

        if (w.radius < w.maxRadius && w.opacity > 0.02) {
          activeWaves.push(w);

          // Map position to map canvas scale
          const mapX = (w.x / containerWidth) * width;
          const mapY = (w.y / containerHeight) * height;
          const mapRadius = (w.radius / containerWidth) * width;

          if (mapRadius > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(mapX, mapY, mapRadius, 0, Math.PI * 2);

            // Draw localized displacement ring (red/green shift)
            const rVal = Math.round(128 + Math.sin(w.radius * 0.2) * 115 * w.opacity);
            const gVal = Math.round(128 + Math.cos(w.radius * 0.2) * 115 * w.opacity);

            ctx.strokeStyle = `rgb(${rVal}, ${gVal}, 0)`;
            ctx.lineWidth = Math.max(2, (6 / containerWidth) * width);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      wavesRef.current = activeWaves;

      // Update SVG feImage displacement texture URL directly
      if (feImageRef.current) {
        feImageRef.current.setAttribute('href', mapCanvas.toDataURL());
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <footer className="w-full bg-gray-100 text-neutral-900 font-sans antialiased flex flex-col select-none relative overflow-hidden">
      {/* SVG Water Liquid Distortion Filter */}
      <svg className="absolute w-0 h-0 pointer-events-none opacity-0" aria-hidden="true">
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            {/* 1. Natural Multi-Harmonic Organic Water Motion */}
            <feTurbulence
              ref={turbulenceRef}
              type="fractalNoise"
              baseFrequency="0.007 0.016"
              numOctaves="3"
              result="ambientNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="ambientNoise"
              scale="7"
              xChannelSelector="R"
              yChannelSelector="G"
              result="ambientDisplaced"
            />

            {/* 2. Localized Cursor Wave Displacement Map */}
            <feImage
              ref={feImageRef}
              href=""
              result="localMap"
            />
            <feDisplacementMap
              in="ambientDisplaced"
              in2="localMap"
              scale="26"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Main Outer Grid Frame */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="mx-2 relative sm:mx-6 md:mx-10 border-x-2 border-gray-300/50 bg-[#fafaf8] text-neutral-900 flex flex-col overflow-hidden"
      >
        {/* UPPER CONTENT (The Object above water - snug bottom padding) */}
        <div className="relative z-20 pt-6 pb-6 sm:pt-8 sm:pb-8 px-4 sm:px-12 border-t-2 border-gray-300/30 bg-[#fafaf8] flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          {/* Left: Brand & Copyright */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 text-center sm:text-left">
            <Link to="/" className="flex items-center gap-2 group">
              <NotlingLogoIcon className="w-4.5 h-4.5 text-neutral-900 transition-transform group-hover:scale-105" />
              <span className="font-bold text-sm tracking-tight text-neutral-900">
                Notling
              </span>
            </Link>
            <span className="text-gray-300 hidden sm:inline">&bull;</span>
            <span className="text-xs text-neutral-500 font-normal">
              &copy; {currentYear} Notling. All rights reserved.
            </span>
          </div>

          {/* Right: Essential Minimal Inline Links & Back to top */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3.5 sm:gap-6 text-xs text-neutral-600 font-medium">
            <Link to="/privacy" className="hover:text-neutral-950 transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-neutral-950 transition-colors">
              Terms
            </Link>
            <Link to="/acceptable-use" className="hover:text-neutral-950 transition-colors">
              Acceptable Use
            </Link>
            <Link to="/cookies" className="hover:text-neutral-950 transition-colors">
              Cookies
            </Link>
            <a
              href={COMMON_LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-950 transition-colors inline-flex items-center gap-1.5"
            >
              <Github className="w-3.5 h-3.5 text-neutral-800" />
              <span>GitHub</span>
            </a>
            <button
              type="button"
              onClick={scrollToTop}
              className="hover:text-neutral-950 transition-colors inline-flex items-center gap-1 p-1 rounded hover:bg-neutral-200/50 cursor-pointer"
              title="Back to top"
            >
              <ArrowUp className="w-3.5 h-3.5 text-neutral-700" />
            </button>
          </div>
        </div>


        {/* LOWER WATER REFLECTION LAYER (Snug waterline alignment & localized cursor wave distortion) */}
        {/* <div className="relative z-10 w-full h-16 sm:h-20 pl-0 overflow-hidden bg-gradient-to-b from-[#fafaf8] via-white/80 to-white select-none pointer-events-none flex items-center justify-center">
          <div
            className="w-full -ml-3 sm:-ml-6.5 py-3 sm:py-4 px-4 sm:px-12 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 opacity-75"
            style={{
              transform: 'scaleY(-1)',
              transformOrigin: '50% 50%',
              filter: `url(#${filterId})`,
              maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.3) 75%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.3) 75%, transparent 100%)',
            }}
          >
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 text-center sm:text-left">
              <div className="flex items-center gap-2">
                <NotlingLogoIcon className="w-4.5 h-4.5 text-neutral-900" />
                <span className="font-bold text-sm tracking-tight text-neutral-900">
                  Notling
                </span>
              </div>
              <span className="text-gray-400 hidden sm:inline">&bull;</span>
              <span className="text-xs text-neutral-600 font-normal">
                &copy; {currentYear} Notling. All rights reserved.
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3.5 sm:gap-6 text-xs text-neutral-700 font-medium">
              <span>Privacy</span>
              <span>Terms</span>
              <span>Acceptable Use</span>
              <span>Cookies</span>
              <span className="inline-flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5 text-neutral-800" />
                <span>GitHub</span>
              </span>
              <button
                type="button"
                onClick={scrollToTop}
                className="hover:text-neutral-950 transition-colors inline-flex items-center gap-1 p-1 rounded hover:bg-neutral-200/50 cursor-pointer"
                title="Back to top"
              >
                <ArrowUp className="w-3.5 h-3.5 text-neutral-700" />
              </button>
            </div>
          </div>
        </div> */}
      </div>

      {/* Architectonic Bottom Frame Cap (Matches Header Grid Cap) */}
      <div className="flex px-0 h-8 sm:h-10">
        <div className="border-t-2 border-r-2 border-gray-300/30 p-1 sm:p-5" />
        <div className="bg-gray-100 border-t-2 border-gray-300/30 w-full" />
        <div className="border-t-2 border-l-2 border-gray-300/30 p-1 sm:p-5" />
      </div>
    </footer>
  );
}

export default Footer;
