import React, { useRef } from 'react';
import { FeatureCard, type FeatureCardData } from './FeatureCard';
import { Footer } from './Footer';
import { BloomFieldGradient } from './BloomFieldGradient';
import { LandingHeader } from './LandingHeader';
import { DashboardMockup } from './DashboardMockup';
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
  ChevronDown,
} from 'lucide-react';
import { COMMON_LINKS } from '#/lib/constants';
import { Link } from '@tanstack/react-router';
import type { SessionData } from '~/lib/types';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'What is Notling?',
    answer: 'Notling is a fast, open-source Notion alternative engineered for distraction-free note-taking, project documentation, and knowledge management. It combines a block-based rich text editor with real-time collaboration, nested page trees, and spreadsheet-like database tables.',
  },
  {
    question: 'How does real-time collaboration work in Notling?',
    answer: 'Notling uses Yjs Conflict-Free Replicated Data Types (CRDTs) paired with WebRTC signaling. Changes sync peer-to-peer in real time with zero merge conflicts, allowing teams to edit documents concurrently with presence awareness and live peer cursors.',
  },
  {
    question: 'Does Notling work offline?',
    answer: 'Yes. Notling is built as a progressive web app (PWA) with client-side caching. You can write, read, and organize your workspace offline, and your changes will automatically sync once your internet connection is restored.',
  },
  {
    question: 'What blocks and database views does Notling support?',
    answer: 'Notling supports headings, task lists, code blocks with syntax highlighting, blockquotes, callouts, and inline tables. You can also create dedicated databases with custom column types (text, numbers, selects, dates, status) and switch between table views and form collections.',
  },
  {
    question: 'Can I export my notes and documents?',
    answer: 'Yes. You have complete data ownership. With a single click, you can export any page or database to standard Markdown (.md) or styled PDF files.',
  },
  {
    question: 'How is my data stored and protected?',
    answer: 'Your notes and databases are stored in your private workspace backed by PostgreSQL and encrypted in transit. You retain complete ownership of your content, and you can export all your data at any time.',
  },
];

interface LandingViewProps {
  onEnterApp: () => void;
  renderWorkspacePreview?: () => React.ReactNode;
  session?: SessionData | null;
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
  session,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoggedIn = !!session;

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
      <LandingHeader onEnterApp={onEnterApp} session={session} />

      <main className="mx-2 sm:mx-6 md:mx-10 border-x-2 border-gray-300/30">
        <section>
          <BloomFieldGradient className="relative">
            {/* 2. Hero Section */}
            <div className="px-4 sm:px-6 pt-12 sm:pt-16 md:pt-24 pb-8 sm:pb-12 text-center max-w-4xl mx-auto flex flex-col items-center gap-4 sm:gap-5">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-medium tracking-tight text-neutral-950 max-w-3xl leading-[1.15]">
                The home for your<br />greatest ideas.
              </h1>

              <p className="text-xs sm:text-base text-neutral-600 max-w-md font-normal leading-relaxed text-center px-2">
                Write, think, and collaborate in one impossibly fast, beautifully distraction-free workspace.
              </p>

              <div className="mt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 w-full sm:w-auto px-4 sm:px-0">
                <Link
                  to={isLoggedIn ? '/dashboard' : '/login'}
                  className="w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer active-press"
                >
                  <span>{isLoggedIn ? 'Open Workspace →' : 'Get Started'}</span>
                </Link>
                <a
                  href={COMMON_LINKS.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-2.5 sm:py-3 rounded bg-white hover:bg-stone-50 text-neutral-900 border border-neutral-300/80 text-xs font-medium transition-all shadow-2xs hover:shadow-xs flex items-center justify-center gap-2 cursor-pointer active-press"
                >
                  <Github className="w-4 h-4 text-neutral-800" />
                  <span>Star on GitHub</span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 ml-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                  </span>
                </a>
              </div>

              {/* Product Hunt Badge */}
              {/* <div className="pt-2 sm:pt-3 flex items-center justify-center">
                <a
                  href="https://www.producthunt.com/products/notling?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-notling"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-transform hover:scale-[1.02] active:scale-[0.98] inline-block shadow-2xs rounded-lg overflow-hidden"
                >
                  <img
                    alt="Notling - An open-source Notion alternative | Product Hunt"
                    src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1285176&theme=light&t=1792484059208"
                    className="w-37.5 sm:w-45 h-auto block"
                  />
                </a>
              </div> */}
            </div>

            {/* 3. Live Workspace Frame Preview */}
            <div className="px-2 sm:px-6 md:px-10 pb-12 sm:pb-20 max-w-6xl mx-auto w-full">
              <div className="rounded-xl sm:rounded-2xl border border-neutral-300/80 bg-white/40 p-1.5 sm:p-2 shadow-xl backdrop-blur-xs">
                <div
                  onClick={onEnterApp}
                  className="w-full h-[420px] sm:h-[520px] md:h-[620px] rounded-lg sm:rounded-xl overflow-hidden bg-white relative cursor-pointer group transition-colors"
                >
                  {renderWorkspacePreview ? renderWorkspacePreview() : <DashboardMockup onNavigate={onEnterApp} />}
                </div>
              </div>
            </div>
          </BloomFieldGradient>
        </section>

        {/* 4. Consolidate Knowledge Section (Data-Driven Feature Cards) */}
        <section id="features" className="py-12 sm:py-20 px-4 sm:px-12 bg-white">
          <div className="max-w-6xl mx-auto flex flex-col gap-8 sm:gap-10">
            <div className="max-w-2xl flex flex-col gap-2.5 sm:gap-3">
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
                className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto pb-4 scroll-smooth no-scrollbar snap-x snap-mandatory"
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
        <section id="why-notling" className="py-16 sm:py-24 px-4 sm:px-12 bg-[#fafaf8] border-t border-neutral-200/80 text-neutral-800">
          <div className="max-w-2xl mx-auto flex flex-col gap-5 sm:gap-6 text-left">
            <h2 className="text-2xl sm:text-4xl font-normal text-neutral-950 tracking-tight leading-tight">
              You wanted a simple workspace.<br />
              We built it.
            </h2>

            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              Noisy software. Endless menus. Slow apps that are more work than work.
            </p>

            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              Modern tools got complicated and only got in the way of true focus.
            </p>

            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              Now you're managing the tool more than capturing your actual thoughts.
            </p>

            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              We created <span className="text-neutral-900 font-medium px-px">Notling</span> to bring back clarity:
              <br />
              Instant speed, pure typography, and easy collaboration in a design that feels like second nature.
            </p>

            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              No complicated onboarding. Just you and your thoughts.
            </p>
          </div>
        </section>

        {/* 6. Frequently Asked Questions (GEO / AI Discoverability) */}
        <section id="faq" className="py-16 sm:py-24 px-4 sm:px-12 bg-white border-t border-neutral-200/80">
          <div className="max-w-3xl mx-auto flex flex-col gap-8 sm:gap-10">
            <div className="text-center flex flex-col gap-2.5 sm:gap-3">
              <span className="text-[11px] font-semibold tracking-wider text-brand-600 uppercase">
                Frequently Asked Questions
              </span>
              <h2 className="text-2xl sm:text-3xl font-medium text-neutral-950 tracking-tight">
                Everything you need to know about Notling
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 max-w-lg mx-auto leading-relaxed">
                Learn how Notling compares to traditional workspaces, handles real-time sync, and protects your data privacy.
              </p>
            </div>

            <div className="flex flex-col divide-y divide-neutral-200/80 border-y border-neutral-200/80">
              {FAQS.map((faq, idx) => (
                <details
                  key={idx}
                  className="group py-4.5 sm:py-5 text-left transition-colors open:bg-neutral-50/50 px-2 sm:px-3 rounded-lg"
                >
                  <summary className="flex items-center justify-between gap-4 font-medium text-xs sm:text-sm text-neutral-900 cursor-pointer list-none select-none">
                    <span>{faq.question}</span>
                    <span className="shrink-0 text-neutral-400 group-open:rotate-180 transition-transform duration-200">
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </summary>
                  <p className="mt-3 text-xs sm:text-sm text-neutral-600 leading-relaxed pr-6">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>

            {/* Embedded FAQPage Schema for AI Engines */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'FAQPage',
                  mainEntity: FAQS.map((faq) => ({
                    '@type': 'Question',
                    name: faq.question,
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: faq.answer,
                    },
                  })),
                }),
              }}
            />
          </div>
        </section>
      </main>

      {/* 7. Footer */}
      <Footer />
    </div>
  );
};
