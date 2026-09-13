import React from 'react';
import { NotlingLogoIcon } from './Icons';
import { ArrowRight, Sparkles, Shield, Zap, Layers } from 'lucide-react';

interface LandingViewProps {
  onEnterApp: () => void;
  renderWorkspacePreview: () => React.ReactNode;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onEnterApp,
  renderWorkspacePreview,
}) => {

  return (
    <div className="min-h-screen bg-[#eef2f6] text-neutral-900 font-sans antialiased flex flex-col selection:bg-neutral-900 selection:text-white">
      {/* 1. Top Navbar */}
      <header className="sticky top-0 z-50 bg-[#eef2f6]/90 backdrop-blur-md px-6 sm:px-12 h-16 flex items-center justify-between border-b border-neutral-200/50">
        {/* Brand */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={onEnterApp}>
          <NotlingLogoIcon className="w-5 h-5 text-brand-text" />
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
            <a href="#why-notling" className="hover:text-neutral-950 transition-colors">
              Why Notling
            </a>
            <a href="#faq" className="hover:text-neutral-950 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Brand Pill Button */}
          <button
            type="button"
            onClick={onEnterApp}
            className="bg-brand-bg hover:bg-brand-hover text-brand-fg text-xs font-medium px-4 py-2 rounded-full transition-all duration-150 shadow-2xs hover:shadow-xs cursor-pointer"
          >
            Get early access
          </button>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="px-6 py-12 md:py-16 text-center max-w-4xl mx-auto flex flex-col items-center gap-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-neutral-200 shadow-2xs text-[11px] font-medium text-neutral-600">
          <Sparkles className="w-3.5 h-3.5 text-neutral-900" />
          <span>Local-First Notion Alternative with PostgreSQL Sync</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-normal tracking-tight text-neutral-950 max-w-3xl leading-[1.1]">
          Your documents, tasks, and ideas in one workspace.
        </h1>

        <p className="text-sm sm:text-base text-neutral-600 max-w-xl font-normal leading-relaxed">
          Notling delivers sub-millisecond local performance with PostgreSQL full-text search, Notion-like block editing, and workspace organization.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <button
            type="button"
            onClick={onEnterApp}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-medium transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Open Notling Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* 3. Live Interactive Workspace Frame Preview */}
      <section className="px-4 sm:px-10 pb-16 max-w-7xl mx-auto w-full">
        <div className="rounded-2xl border border-neutral-200/90 bg-white/60 p-2 sm:p-3 shadow-xl backdrop-blur-xs">
          <div className="w-full h-[620px] rounded-xl overflow-hidden border border-neutral-200 bg-white">
            {renderWorkspacePreview()}
          </div>
        </div>
      </section>

      {/* 4. Value Props / Feature Grid */}
      <section id="features" className="px-6 py-16 bg-white border-t border-neutral-200/80">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900 mb-1">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-neutral-900 text-sm">BlockNote Block Editor</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Notion-style rich text editing, slash commands, drag and drop blocks, and clean typography.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900 mb-1">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-neutral-900 text-sm">Nested Folders & Tabs</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Multi-tab document management, hierarchical sidebar navigation, and organized collections.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900 mb-1">
              <Shield className="w-4 h-4" />
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
            <NotlingLogoIcon className="w-4 h-4 text-neutral-800" />
            <span className="font-semibold text-neutral-800">Notling</span>
            <span>&bull;</span>
            <span>Local-First Workspace System</span>
          </div>
          <div>&copy; 2026 Notling Technologies. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};
