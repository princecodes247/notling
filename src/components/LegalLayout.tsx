import React from 'react';
import { Link } from '@tanstack/react-router';
import { NotlingLogoIcon } from './Icons';
import { Footer } from './Footer';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

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
    <div className="min-h-screen bg-[#fafaf8] dark:bg-[#0e0e10] text-neutral-900 dark:text-neutral-100 font-sans antialiased flex flex-col selection:bg-neutral-900 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-[#fafaf8]/90 dark:bg-[#0e0e10]/90 backdrop-blur-md px-6 sm:px-12 h-16 flex items-center justify-between border-b border-neutral-200/70 dark:border-zinc-800">
        <Link to="/" className="flex items-center gap-2.5 group">
          <NotlingLogoIcon className="w-5 h-5 text-brand-text transition-transform group-hover:scale-105" />
          <span className="font-bold text-base tracking-tight text-neutral-900 dark:text-white">
            Notling
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-zinc-400 hover:text-neutral-950 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Notling</span>
          </Link>
        </div>
      </header>

      {/* Main Content Article */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 md:py-16">
        {/* Document Header */}
        <div className="pb-8 mb-8 border-b border-neutral-200 dark:border-zinc-800 flex flex-col gap-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full w-fit border border-emerald-200/80 dark:border-emerald-900/50">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Legal & Governance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-950 dark:text-white">
            {title}
          </h1>
          <p className="text-sm text-neutral-600 dark:text-zinc-400 leading-relaxed">
            {subtitle}
          </p>
          <div className="text-xs text-neutral-400 dark:text-zinc-500 pt-1">
            Last updated: {lastUpdated}
          </div>
        </div>

        {/* Article Body */}
        <div className="prose prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed space-y-6 text-neutral-700 dark:text-zinc-300">
          {children}
        </div>
      </main>

      {/* Shared Footer */}
      <Footer />
    </div>
  );
};
