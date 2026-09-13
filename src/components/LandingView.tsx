import React, { useRef } from 'react';
import { NotlingLogoIcon } from './Icons';
import {
  ArrowRight,
  FileText,
  Search,
  Users,
  Layers,
  Zap,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface LandingViewProps {
  onEnterApp: () => void;
  renderWorkspacePreview: () => React.ReactNode;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onEnterApp,
  renderWorkspacePreview,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-neutral-900 font-sans antialiased flex flex-col selection:bg-neutral-900 selection:text-white">
      {/* 1. Top Navbar */}
      <header className="sticky top-0 z-50  px-0 h-16  border-neutral-200/50 flex">
        <div className='border-b-2 border-r-2 border-gray-300/30 p-5' />
        <div className='bg-[#eef2f6]/90 backdrop-blur-sm px-4 flex items-center justify-between border-b-2 border-gray-300/30 w-full'>
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
        </div>
        <div className='border-b-2 border-l-2 border-gray-300/30 p-5' />

      </header>
      <main className='mx-10 border-x-2 border-gray-300/30'>
        <section>
          <div className='bg-[#eef2f6]'>

            {/* 2. Hero Section */}
            <div className="px-6 pt-16 md:pt-24 pb-12 text-center max-w-4xl mx-auto flex flex-col items-center gap-5">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-neutral-950 max-w-3xl leading-[1.15]">
                The easiest way<br />to share your ideas.
              </h1>

              <p className="text-sm sm:text-base text-neutral-600 max-w-md font-normal leading-relaxed text-center">
                Collaborate with your teammates, agents easily.
              </p>

              <div className="mt-2">
                <button
                  type="button"
                  onClick={onEnterApp}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-brand-bg hover:bg-brand-hover text-brand-fg text-xs font-medium transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer active-press"
                >
                  <span>Get Started</span>
                </button>
              </div>
            </div>

            {/* 3. Live Workspace Frame Preview (Framed Outer Border & Gradient) */}
            <div className="px-4 sm:px-10 pb-20 max-w-6xl mx-auto w-full">
              <div className="rounded-2xl border border-neutral-300/80 bg-white/40 p-2 sm:p-3 shadow-xl backdrop-blur-xs">
                <div className="w-full h-[520px] md:h-[620px] rounded-xl overflow-hidden border border-neutral-200/90 bg-white relative">
                  {renderWorkspacePreview()}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Consolidate Knowledge Section (Horizontal Scrollable Cards) */}
        <section id="features" className="py-20 px-6 sm:px-12 bg-white">
          <div className="max-w-6xl mx-auto flex flex-col gap-10">
            <div className="max-w-2xl flex flex-col gap-3">
              <h2 className="text-2xl sm:text-3xl font-medium text-neutral-950 tracking-tight leading-snug">
                Consolidate all your knowledge into one shared workspace
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
                Everything consolidates into one clean, fast workspace accessible from your desktop or mobile. Collaborate on documents, specs, and notes with your team in real time, no matter where you start, and never lose an idea again.
              </p>
            </div>

            {/* Cards Carousel Container */}
            <div className="relative group">
              <div
                ref={scrollRef}
                className="flex items-stretch gap-4 overflow-x-auto pb-4 scroll-smooth no-scrollbar snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {/* Card 1: BlockNote Editor */}
                <div className="min-w-[280px] sm:min-w-[320px] flex-1 bg-[#f8fafc] hover:bg-[#f1f5f9] p-6 rounded-2xl border border-neutral-200/80 flex flex-col justify-between transition-all duration-200 snap-start">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200/80 shadow-2xs flex items-center justify-center text-neutral-800 mb-5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-sm text-neutral-900 mb-2">BlockNote Editor</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed mb-6">
                      Notion-style block editing with slash commands, drag-and-drop hierarchy, markdown import/export, and live multi-cursor editing.
                    </p>
                  </div>
                  <button type="button" onClick={onEnterApp} className="text-xs font-semibold text-neutral-900 inline-flex items-center gap-1 hover:gap-2 transition-all cursor-pointer self-start">
                    <span>Learn more</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Card 2: Instant GIN Search */}
                <div className="min-w-[280px] sm:min-w-[320px] flex-1 bg-[#f8fafc] hover:bg-[#f1f5f9] p-6 rounded-2xl border border-neutral-200/80 flex flex-col justify-between transition-all duration-200 snap-start">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200/80 shadow-2xs flex items-center justify-center text-neutral-800 mb-5">
                      <Search className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-sm text-neutral-900 mb-2">Instant GIN Search</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed mb-6">
                      Sub-millisecond full-text search across all titles, body blocks, and folder trees powered by PostgreSQL indexing via Cmd+K.
                    </p>
                  </div>
                  <button type="button" onClick={onEnterApp} className="text-xs font-semibold text-neutral-900 inline-flex items-center gap-1 hover:gap-2 transition-all cursor-pointer self-start">
                    <span>Learn more</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Card 3: Real-time Sync */}
                <div className="min-w-[280px] sm:min-w-[320px] flex-1 bg-[#f8fafc] hover:bg-[#f1f5f9] p-6 rounded-2xl border border-neutral-200/80 flex flex-col justify-between transition-all duration-200 snap-start">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200/80 shadow-2xs flex items-center justify-center text-neutral-800 mb-5">
                      <Users className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-sm text-neutral-900 mb-2">Real-time Collaboration</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed mb-6">
                      Collaborate live with teammates, see real-time active cursors, presence indicators, and share granular permission links.
                    </p>
                  </div>
                  <button type="button" onClick={onEnterApp} className="text-xs font-semibold text-neutral-900 inline-flex items-center gap-1 hover:gap-2 transition-all cursor-pointer self-start">
                    <span>Learn more</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Card 4: Nested Hierarchy */}
                <div className="min-w-[280px] sm:min-w-[320px] flex-1 bg-[#f8fafc] hover:bg-[#f1f5f9] p-6 rounded-2xl border border-neutral-200/80 flex flex-col justify-between transition-all duration-200 snap-start">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200/80 shadow-2xs flex items-center justify-center text-neutral-800 mb-5">
                      <Layers className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-sm text-neutral-900 mb-2">Nested Folders & Tabs</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed mb-6">
                      Organize pages into multi-level folders, switch between documents with browser-style tabs, and pin your daily favorites.
                    </p>
                  </div>
                  <button type="button" onClick={onEnterApp} className="text-xs font-semibold text-neutral-900 inline-flex items-center gap-1 hover:gap-2 transition-all cursor-pointer self-start">
                    <span>Learn more</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Card 5: Local-First Speed */}
                <div className="min-w-[280px] sm:min-w-[320px] flex-1 bg-[#f8fafc] hover:bg-[#f1f5f9] p-6 rounded-2xl border border-neutral-200/80 flex flex-col justify-between transition-all duration-200 snap-start">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200/80 shadow-2xs flex items-center justify-center text-neutral-800 mb-5">
                      <Zap className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-sm text-neutral-900 mb-2">Local-First Speed</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed mb-6">
                      Lightning-fast page renders with optimistic updates, local state persistence, and anti-wipe data integrity protection.
                    </p>
                  </div>
                  <button type="button" onClick={onEnterApp} className="text-xs font-semibold text-neutral-900 inline-flex items-center gap-1 hover:gap-2 transition-all cursor-pointer self-start">
                    <span>Learn more</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Scroll Control Arrows */}
              <button
                type="button"
                onClick={() => scroll('left')}
                className="absolute -left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border border-neutral-200 shadow-md text-neutral-600 hover:text-neutral-900 hidden sm:flex items-center justify-center transition-all cursor-pointer z-10 hover:scale-105 active:scale-95"
                title="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                className="absolute -right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border border-neutral-200 shadow-md text-neutral-600 hover:text-neutral-900 hidden sm:flex items-center justify-center transition-all cursor-pointer z-10 hover:scale-105 active:scale-95"
                title="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* 5. Manifesto / Story Section */}
        <section id="why-notling" className="py-24 px-6 sm:px-12 bg-[#fafaf8] border-t border-neutral-200/80 text-neutral-800">
          <div className="max-w-2xl mx-auto flex flex-col gap-6 text-left">
            <h2 className="text-3xl sm:text-4xl font-normal text-neutral-950 tracking-tight leading-tight">
              You wanted a simple workspace.<br />
              We've built it.
            </h2>

            <p className="text-sm text-neutral-600 leading-relaxed">
              Scattered docs. Bloated apps. Complex tools with endless nested menus, sluggish load times, and paywalls around basic team sharing.
            </p>

            <p className="text-sm text-neutral-600 leading-relaxed">
              Other workspace tools got slow and complicated. They added forced AI features, cluttered sidebar panels, and subscription tiers that locked your data behind proprietary formats.
            </p>

            <p className="text-sm text-neutral-600 leading-relaxed font-medium text-neutral-900">
              Now you're managing the tool more than organizing your actual thoughts and work.
            </p>

            <p className="text-sm text-neutral-600 leading-relaxed">
              Notling brings it back to simple: A fast workspace, Notion-style block editing, real-time collaboration, and instant full-text search, all in one place. Built on TanStack Start, Nitro, and PostgreSQL so your data is fast, reliable, and transparent.
            </p>

            <p className="text-sm text-neutral-600 leading-relaxed">
              No setup maze. No annoying sales calls. No feature overload. Just something that works.
            </p>

            <div className="mt-4 pt-2 flex flex-col text-xs text-neutral-500 font-medium">
              <span className="text-neutral-900 font-semibold">The Notling Team</span>
              <span>Founders</span>
            </div>
          </div>
        </section>

      </main>
      {/* 6. Footer */}
      <footer className="mt-auto border-t border-neutral-200/80 py-8 px-6 text-center text-xs text-neutral-500 bg-white">
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
