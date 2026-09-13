import React, { useRef } from 'react';
import { NotlingLogoIcon } from './Icons';
import { FeatureCard, type FeatureCardData } from './FeatureCard';
import {
  FileText,
  Search,
  Users,
  Layers,
  Zap,
  ChevronRight,
  ChevronLeft,
  Github,
  Star,
} from 'lucide-react';

interface LandingViewProps {
  onEnterApp: () => void;
  renderWorkspacePreview: () => React.ReactNode;
}

const FEATURE_CARDS: FeatureCardData[] = [
  {
    id: 'editor',
    title: 'Effortless Writing',
    description: 'A distraction-free canvas that flows as fast as your thoughts. Type, format, and structure with fluid elegance.',
    icon: FileText,
  },
  {
    id: 'search',
    title: 'Instant Search',
    description: 'Find anything in a heartbeat. Every document, note, and detail is right at your fingertips the moment you need it.',
    icon: Search,
  },
  {
    id: 'collaboration',
    title: 'Seamless Collaboration',
    description: "Work together in real time like you're in the same room. Share ideas instantly with beautiful simplicity.",
    icon: Users,
  },
  {
    id: 'hierarchy',
    title: 'Thoughtful Organization',
    description: 'Keep your mind clutter-free. Nested collections and fluid browser tabs make navigating your work second nature.',
    icon: Layers,
  },
  {
    id: 'speed',
    title: 'Blazing Speed',
    description: 'Instant response. Zero waiting. Engineered from the ground up to feel impossibly fast, everywhere you go.',
    icon: Zap,
  },
];

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
      <header className="sticky top-0 z-50 px-0 h-16 border-neutral-200/50 flex">
        <div className="border-b-2 border-r-2 border-gray-300/30 p-5" />
        <div className="bg-[#eef2f6]/90 backdrop-blur-sm px-14 flex items-center justify-between border-b-2 border-gray-300/30 w-full">
          {/* Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={onEnterApp}>
            <NotlingLogoIcon className="w-5 h-5 text-brand-text" />
            <span className="font-bold text-base tracking-tight text-neutral-900">
              Notling
            </span>
          </div>

          {/* Right Links */}
          <div className="flex items-center gap-6 sm:gap-8">


            {/* Brand Pill Button */}
            <button
              type="button"
              onClick={onEnterApp}
              className="bg-brand-bg hover:bg-brand-hover text-brand-fg text-xs font-medium px-4 py-2 rounded-full transition-all duration-150 shadow-2xs hover:shadow-xs cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
        <div className="border-b-2 border-l-2 border-gray-300/30 p-5" />
      </header>

      <main className="mx-10 border-x-2 border-gray-300/30">
        <section>
          <div className="bg-[#eef2f6]">
            {/* 2. Hero Section */}
            <div className="px-6 pt-16 md:pt-24 pb-12 text-center max-w-4xl mx-auto flex flex-col items-center gap-5">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-neutral-950 max-w-3xl leading-[1.15]">
                {/* Everything you write. <br />Nowhere it doesn't belong. */}
                The home for your<br />greatest ideas.
              </h1>

              <p className="text-sm sm:text-base text-neutral-600 max-w-md font-normal leading-relaxed text-center">
                Write, think, and collaborate in one impossibly fast, beautifully distraction-free workspace.
              </p>

              <div className="mt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onEnterApp}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-brand-bg hover:bg-brand-hover text-brand-fg text-xs font-medium transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer active-press"
                >
                  <span>Get Started</span>
                </button>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-3 rounded-full bg-white hover:bg-stone-50 text-neutral-900 border border-neutral-300/80 text-xs font-medium transition-all shadow-2xs hover:shadow-xs flex items-center justify-center gap-2 cursor-pointer active-press"
                >
                  <Github className="w-4 h-4 text-neutral-800" />
                  <span>Star on GitHub</span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 ml-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                  </span>
                </a>
              </div>
            </div>

            {/* 3. Live Workspace Frame Preview */}
            <div className="px-4 sm:px-10 pb-20 max-w-6xl mx-auto w-full">
              <div className="rounded-2xl border border-neutral-300/80 bg-white/40 p-2 sm:p-3 shadow-xl backdrop-blur-xs">
                <div className="w-full h-[520px] md:h-[620px] rounded-xl overflow-hidden border border-neutral-200/90 bg-white relative">
                  {renderWorkspacePreview()}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Consolidate Knowledge Section (Data-Driven Feature Cards) */}
        <section id="features" className="py-20 px-6 sm:px-12 bg-white">
          <div className="max-w-6xl mx-auto flex flex-col gap-10">
            <div className="max-w-2xl flex flex-col gap-3">
              <h2 className="text-2xl sm:text-3xl font-medium text-neutral-950 tracking-tight leading-snug">
                All your thoughts.<br className="hidden sm:inline" /> One beautiful place.
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
                Everything you create comes together in harmony. A single, elegant workspace designed to help you focus, collaborate, and bring your best work to life.
              </p>
            </div>

            {/* Cards Carousel Container */}
            <div className="relative group">
              <div
                ref={scrollRef}
                className="flex items-stretch gap-4 overflow-x-auto pb-4 scroll-smooth no-scrollbar snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {FEATURE_CARDS.map((card) => (
                  <FeatureCard
                    key={card.id}
                    card={card}
                    onAction={onEnterApp}
                  />
                ))}
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
              I built it.
            </h2>

            <p className="text-sm text-neutral-600 leading-relaxed">
              Noisy software. Endless menus. Slow apps that are more work than work.
            </p>

            <p className="text-sm text-neutral-600 leading-relaxed">
              Modern tools got complicated and only got in the way of true focus.
            </p>

            <p className="text-sm text-neutral-600 leading-relaxed">
              Now you're managing the tool more than capturing your actual thoughts.
            </p>

            <p className="text-sm text-neutral-600 leading-relaxed">
              I created <span className="text-neutral-900 font-medium px-px">Notling</span> to bring back clarity: Instant speed, pure typography, and easy collaboration in a design that feels like second nature.
            </p>

            <p className="text-sm text-neutral-600 leading-relaxed">
              No complicated onboarding. Just you and your thoughts.
            </p>
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
