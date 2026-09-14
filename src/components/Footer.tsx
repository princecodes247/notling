import React, { useRef, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { NotlingLogoIcon } from './Icons';
import { Github, ArrowUp } from 'lucide-react';
import { COMMON_LINKS } from '#/lib/constants';

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  intensity: number;
}

export function Footer() {
  const currentYear = new Date().getFullYear();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Unique filter ID to avoid conflicts
  const [filterId] = useState(() => `water-ripple-${Math.random().toString(36).substring(2, 9)}`);

  // Water animation state
  const ripplesRef = useRef<Ripple[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const [turbulenceFreq, setTurbulenceFreq] = useState<number>(0.015);
  const [displacementScale, setDisplacementScale] = useState<number>(12);

  // Mouse movement handler to create water ripples
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lastRipple = ripplesRef.current[ripplesRef.current.length - 1];
    if (!lastRipple || Math.hypot(lastRipple.x - x, lastRipple.y - y) > 12) {
      ripplesRef.current.push({
        x,
        y,
        radius: 3,
        maxRadius: Math.random() * 45 + 55,
        speed: 1.4 + Math.random() * 0.8,
        intensity: 0.85,
      });

      // Increase SVG displacement scale temporarily during movement
      setDisplacementScale(16);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Canvas & SVG animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.025;

      // Gentle sine-wave modulation for realistic ambient liquid motion
      const currentFreq = 0.012 + Math.sin(time) * 0.003;
      setTurbulenceFreq(currentFreq);

      // Return displacement scale back to base state smoothly
      setDisplacementScale((prev) => Math.max(9, prev * 0.985));

      // Sync canvas dimensions
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw dynamic concentric ripple rings
      const activeRipples: Ripple[] = [];

      for (const r of ripplesRef.current) {
        r.radius += r.speed;
        r.intensity *= 0.965;

        if (r.radius < r.maxRadius && r.intensity > 0.01) {
          activeRipples.push(r);

          const alpha = (1 - r.radius / r.maxRadius) * r.intensity;

          ctx.save();

          // White wave crest specular highlight
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Azure blue wave trough shadow
          ctx.beginPath();
          ctx.arc(r.x, r.y, Math.max(0, r.radius - 2.5), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.55})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.restore();
        }
      }

      ripplesRef.current = activeRipples;
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
      {/* SVG Water Ripple Turbulence Filter */}
      <svg className="absolute w-0 h-0 pointer-events-none opacity-0" aria-hidden="true">
        <defs>
          <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={`0.01 ${turbulenceFreq.toFixed(4)}`}
              numOctaves="2"
              result="waterNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="waterNoise"
              scale={displacementScale}
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
        className="mx-2 relative sm:mx-6 md:mx-10 border-x-2 border-gray-300/50 bg-[#fafaf8] text-neutral-900 relative flex flex-col overflow-hidden"
      >
        {/* UPPER CONTENT (The Object above water) */}
        <div className="relative z-20 py-6 sm:py-8 px-4 sm:px-12 border-t-2 border-gray-300/30 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          {/* Left: Brand & Copyright */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 text-center sm:text-left">
            <Link to="/" className="flex items-center gap-2 group">
              <NotlingLogoIcon className="w-4.5 h-4.5 text-brand-text transition-transform group-hover:scale-105" />
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

        {/* LOWER WATER REFLECTION LAYER */}
        <div className="absolute inset-0 w-full h-24 sm:h-32 overflow-hidden bg-gradient-to-b from-[#e0f2fe]/80 via-[#bae6fd]/45 to-slate-200/60 select-none pointer-events-none">
          {/* Mirrored Content with Water Distortion Filter */}
          <div
            className="w-full py-6 sm:py-8 px-4 sm:px-12 opacity-60 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 origin-top"
            style={{
              transform: 'scaleY(-1) translateY(-1px)',
              filter: `url(#${filterId})`,
              maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.35) 55%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.35) 55%, transparent 100%)',
            }}
          >
            {/* Mirrored Brand */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 text-center sm:text-left">
              <div className="flex items-center gap-2">
                <NotlingLogoIcon className="w-4.5 h-4.5 text-brand-text" />
                <span className="font-bold text-sm tracking-tight text-neutral-900">
                  Notling
                </span>
              </div>
              <span className="text-gray-300 hidden sm:inline">&bull;</span>
              <span className="text-xs text-neutral-500 font-normal">
                &copy; {currentYear} Notling. All rights reserved.
              </span>
            </div>

            {/* Mirrored Links */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3.5 sm:gap-6 text-xs text-neutral-600 font-medium">
              <span>Privacy</span>
              <span>Terms</span>
              <span>Acceptable Use</span>
              <span>Cookies</span>
              <span className="inline-flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5 text-neutral-800" />
                <span>GitHub</span>
              </span>
            </div>
          </div>

          {/* Interactive Water Ripple Canvas Layer */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-10 w-full h-full mix-blend-overlay"
          />

          {/* Liquid Shimmer Surface Highlight */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-sky-100/30 via-transparent to-sky-300/10 animate-pulse" />
        </div>
      </div>

      {/* Architectonic Bottom Frame Cap (Matches Header Grid Cap) */}
      <div className="flex px-0 h-8 sm:h-10">
        <div className="border-t-2 border-r-2 border-gray-300/30 p-2.5 sm:p-5" />
        <div className="bg-gray-100 border-t-2 border-gray-300/30 w-full" />
        <div className="border-t-2 border-l-2 border-gray-300/30 p-2.5 sm:p-5" />
      </div>
    </footer>
  );
}

export default Footer;
