import React from 'react';
import { Link } from '@tanstack/react-router';
import { NotlingLogoIcon } from './Icons';
import { Footer } from './Footer';
import { ArrowLeft } from 'lucide-react';

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export const LegalLayout: React.FC<LegalLayoutProps> = ({
  title,
  subtitle,
  lastUpdated,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#fafaf8] text-neutral-900 font-sans antialiased flex flex-col selection:bg-neutral-900 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-[#fafaf8]/90 backdrop-blur-md px-6 sm:px-12 h-16 flex items-center justify-between border-b border-neutral-200/70">
        <Link to="/" className="flex items-center gap-2.5 group">
          <NotlingLogoIcon className="w-5 h-5 text-black transition-transform group-hover:scale-105" />
          <span className="font-bold text-base tracking-tight text-neutral-900">
            Notling
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-950 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Notling</span>
          </Link>
        </div>
      </header>

      {/* Main Content Article */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 md:py-16">
        {/* Document Header */}
        <div className="pb-8 mb-8 border-b border-neutral-200 flex flex-col gap-3">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-950">
            {title}
          </h1>
          <p className="text-sm text-neutral-600 leading-relaxed">
            {subtitle}
          </p>
          <div className="text-xs text-neutral-400 pt-1">
            Last updated: {lastUpdated}
          </div>
        </div>

        {/* Article Body */}
        <div className="prose prose-neutral max-w-none text-sm leading-relaxed space-y-6 text-neutral-700">
          {children}
        </div>
      </main>

      {/* Shared Footer */}
      <Footer />
    </div>
  );
};
