import React, { useState } from 'react';
import { DanceLogoIcon } from './Icons';
import { ArrowRight, Check, Sparkles, Shield, Zap, Layers } from 'lucide-react';

interface LandingViewProps {
  onEnterApp: () => void;
  renderWorkspacePreview: () => React.ReactNode;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onEnterApp,
  renderWorkspacePreview,
}) => {
  const [headlineMode, setHeadlineMode] = useState<'events' | 'notes'>('events');

  return (
    <div className="min-h-screen bg-[#eef2f6] text-neutral-900 font-sans antialiased flex flex-col selection:bg-neutral-900 selection:text-white">
      {/* 1. Top Navbar (useDance 1:1) */}
      <header className="sticky top-0 z-50 bg-[#eef2f6]/90 backdrop-blur-md px-6 sm:px-12 h-16 flex items-center justify-between border-b border-neutral-200/50">
        {/* Brand */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={onEnterApp}>
          <DanceLogoIcon className="w-5 h-5 text-neutral-900" />
          <span className="font-bold text-base tracking-tight text-neutral-900">
            Notling
          </span>
        </div>

        {/* Center / Right Links */}
        <div className="flex items-center gap-6 sm:gap-8">
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-neutral-600">
            <a href="#use-cases" className="hover:text-neutral-950 transition-colors">
              Use Cases
            </a>
            <a href="#features" className="hover:text-neutral-950 transition-colors">
              Features
            </a>
            <a href="#why-dance" className="hover:text-neutral-950 transition-colors">
              Why Dance
            </a>
            <a href="#faq" className="hover:text-neutral-950 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Black Pill Button */}
          <button
            type="button"
            onClick={onEnterApp}
            className="bg-black hover:bg-neutral-800 text-white text-xs font-medium px-4 py-2 rounded-full transition-all duration-150 shadow-2xs hover:shadow-xs cursor-pointer"
          >
            Get early access
          </button>
        </div>
      </header>

      {/* 2. Hero Section (useDance 1:1) */}
      <section className="pt-16 pb-12 px-6 sm:px-10 flex flex-col items-center text-center max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-normal tracking-tight text-neutral-950 max-w-3xl leading-[1.15] mb-4">
          The smartest way<br />to plan events.
        </h1>

        <p className="text-sm sm:text-base text-neutral-500 max-w-xl font-normal leading-relaxed mb-7">
          Collaborate with your teammates and event agents to stay aligned and under budget.
        </p>

        {/* Hero CTA Button */}
        <button
          type="button"
          onClick={onEnterApp}
          className="bg-black hover:bg-neutral-800 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-all duration-150 shadow-xs hover:shadow cursor-pointer flex items-center gap-2"
        >
          <span>Get early access</span>
        </button>
      </section>

      {/* 3. Embedded Interactive Workspace Preview Card (Image 2) */}
      <section className="px-4 sm:px-8 pb-20 max-w-[1240px] w-full mx-auto">
        <div className="rounded-2xl border border-neutral-200/90 bg-white shadow-xl overflow-hidden h-[720px] flex flex-col relative transition-all">
          {/* Live Workspace Render */}
          {renderWorkspacePreview()}
        </div>
      </section>

      {/* 4. Features Grid */}
      <section id="features" className="py-16 px-6 sm:px-12 max-w-6xl mx-auto w-full border-t border-neutral-200/60">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Intelligent Coordination
          </span>
          <h2 className="text-2xl sm:text-3xl font-normal tracking-tight text-neutral-900 mt-1">
            Precision workflows designed for focus
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex flex-col gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900">
              <Layers className="w-5 h-5 stroke-[1.75]" />
            </div>
            <h3 className="font-semibold text-neutral-900 text-sm">Nested Document Trees</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Organize projects with infinite page depth, breadcrumbs, and instant drag/reorder workflows.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex flex-col gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900">
              <Zap className="w-5 h-5 stroke-[1.75]" />
            </div>
            <h3 className="font-semibold text-neutral-900 text-sm">Block Editor & Autosave</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              BlockNote rich-text engine with slash commands, code blocks, checklists, and 800ms debounced autosave.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex flex-col gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900">
              <Shield className="w-5 h-5 stroke-[1.75]" />
            </div>
            <h3 className="font-semibold text-neutral-900 text-sm">PostgreSQL GIN Search</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Sub-millisecond full-text queries across document titles and plain-text body indices via Cmd+K.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Footer */}
      <footer className="mt-auto border-t border-neutral-200/80 py-8 px-6 text-center text-xs text-neutral-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <DanceLogoIcon className="w-4 h-4 text-neutral-800" />
            <span className="font-semibold text-neutral-800">Dance</span>
            <span>&bull;</span>
            <span>Notling Workspace System</span>
          </div>
          <div>&copy; 2026 Dance Technologies. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};
