import { Link } from '@tanstack/react-router';
import { NotlingLogoIcon } from './Icons';
import { Github } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-[#fafaf8] dark:bg-[#121214] border-t border-neutral-200/80 dark:border-zinc-800 text-neutral-600 dark:text-zinc-400 font-sans transition-colors">
      <div className="max-w-6xl mx-auto px-6 sm:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-8 pb-12 border-b border-neutral-200/70 dark:border-zinc-800/80">
          
          {/* Brand Column */}
          <div className="md:col-span-2 flex flex-col gap-3 pr-4">
            <Link to="/" className="flex items-center gap-2.5 group w-fit">
              <NotlingLogoIcon className="w-5 h-5 text-brand-text transition-transform group-hover:scale-105" />
              <span className="font-bold text-base tracking-tight text-neutral-900 dark:text-white">
                Notling
              </span>
            </Link>
            <p className="text-xs text-neutral-500 dark:text-zinc-400 leading-relaxed max-w-sm">
              The simplest, fastest home for your thoughts, notes, and documents. Engineered for speed, privacy, and quiet focus.
            </p>
          </div>

          {/* Column 1: Product */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-zinc-200">
              Product
            </h4>
            <ul className="flex flex-col gap-2 text-xs">
              <li>
                <Link to="/" className="hover:text-neutral-950 dark:hover:text-white transition-colors">
                  Overview
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-neutral-950 dark:hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/security" className="hover:text-neutral-950 dark:hover:text-white transition-colors">
                  Security
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Legal & Governance */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-zinc-200">
              Legal
            </h4>
            <ul className="flex flex-col gap-2 text-xs">
              <li>
                <Link to="/privacy" className="hover:text-neutral-950 dark:hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-neutral-950 dark:hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/acceptable-use" className="hover:text-neutral-950 dark:hover:text-white transition-colors">
                  Acceptable Use
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-neutral-950 dark:hover:text-white transition-colors">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Connect */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-zinc-200">
              Connect
            </h4>
            <ul className="flex flex-col gap-2 text-xs">
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neutral-950 dark:hover:text-white transition-colors inline-flex items-center gap-1.5"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400 dark:text-zinc-500">
          <div>
            &copy; {currentYear} Notling Technologies. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-neutral-600 dark:hover:text-zinc-300 transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-neutral-600 dark:hover:text-zinc-300 transition-colors">
              Terms
            </Link>
            <Link to="/cookies" className="hover:text-neutral-600 dark:hover:text-zinc-300 transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
