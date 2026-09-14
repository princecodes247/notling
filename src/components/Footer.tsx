import { Link } from '@tanstack/react-router';
import { NotlingLogoIcon } from './Icons';
import { Github } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-gray-100 text-neutral-900 font-sans antialiased flex flex-col select-none">
      {/* Footer Content inside Landing Grid Frame with Subtle Dither/Halftone Effect */}
      <div className="mx-10 border-x-2 border-gray-300/30 bg-[#eef2f6] text-neutral-900 relative overflow-hidden">
        
        {/* Subtle Halftone / Dither Dot Texture Layer */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage: `radial-gradient(#334155 0.75px, transparent 0.75px), radial-gradient(#334155 0.75px, transparent 0.75px)`,
            backgroundSize: '10px 10px',
            backgroundPosition: '0 0, 5px 5px',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.2))',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.2))',
          }}
        />

        {/* Ultra-Minimal Single-Row Footer */}
        <div className="relative z-10 py-8 px-6 sm:px-12 border-t-2 border-gray-300/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Left: Brand & Copyright */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <NotlingLogoIcon className="w-4.5 h-4.5 text-brand-text transition-transform group-hover:scale-105" />
              <span className="font-bold text-sm tracking-tight text-neutral-900">
                Notling
              </span>
            </Link>
            <span className="text-gray-300">&bull;</span>
            <span className="text-xs text-neutral-500 font-normal">
              &copy; {currentYear} Notling. All rights reserved.
            </span>
          </div>

          {/* Right: Essential Minimal Inline Links */}
          <div className="flex items-center gap-5 sm:gap-6 text-xs text-neutral-600 font-medium">
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
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-950 transition-colors inline-flex items-center gap-1.5"
            >
              <Github className="w-3.5 h-3.5 text-neutral-800" />
              <span>GitHub</span>
            </a>
          </div>

        </div>
      </div>

      {/* Architectonic Bottom Frame Cap (Matches Header Grid Cap) */}
      <div className="flex px-0 h-10">
        <div className="border-t-2 border-r-2 border-gray-300/30 p-5" />
        <div className="bg-[#eef2f6] border-t-2 border-gray-300/30 w-full" />
        <div className="border-t-2 border-l-2 border-gray-300/30 p-5" />
      </div>
    </footer>
  );
}

export default Footer;
