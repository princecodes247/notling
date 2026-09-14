import { Link } from '@tanstack/react-router';
import { NotlingLogoIcon } from './Icons';
import { Github } from 'lucide-react';
import { COMMON_LINKS } from '#/lib/constants';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-gray-100 text-neutral-900 font-sans antialiased flex flex-col select-none">
      {/* Footer Content inside Landing Grid Frame with Subtle Dither/Halftone Effect */}
      <div className="mx-2 sm:mx-6 md:mx-10 border-x-2 border-gray-300/50 bg-[#fafaf8] text-neutral-900 relative overflow-hidden">


        {/* Ultra-Minimal Single-Row Footer */}
        <div className="relative z-10 py-6 sm:py-8 px-4 sm:px-12 border-t-2 border-gray-300/30 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">

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

          {/* Right: Essential Minimal Inline Links */}
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
          </div>

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
