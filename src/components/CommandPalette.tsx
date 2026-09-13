import React, { useState, useEffect } from 'react';
import { Search, X, FileText, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUIStore } from '~/store/uiStore';
import { useQuery } from '@tanstack/react-query';
import { searchPages } from '~/server/pages';
import { useIsMobile } from '~/hooks/useIsMobile';
import { BottomSheet } from './BottomSheet';

interface CommandPaletteProps {
  workspaceId: string;
  onSelectPage: (pageId: string) => void;
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!text || !query.trim()) return <>{text}</>;
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return <>{text}</>;

  const regex = new RegExp(`(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        tokens.includes(part.toLowerCase()) ? (
          <mark key={i} className="bg-amber-200/90 text-amber-950 font-semibold px-0.5 rounded-2xs">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  workspaceId,
  onSelectPage,
}) => {
  const isMobile = useIsMobile();
  const isSearchOpen = useUIStore((state) => state.isSearchOpen);
  const setSearchOpen = useUIStore((state) => state.setSearchOpen);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Debounced search query
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Query search from server
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['pages', 'search', workspaceId, debouncedQuery],
    queryFn: () => searchPages({ data: { workspaceId, query: debouncedQuery } }),
    enabled: isSearchOpen && debouncedQuery.trim().length >= 3,
    staleTime: 1000 * 30, // 30 seconds
  });

  const results = debouncedQuery.trim().length >= 3 ? searchResults : [];

  // Reset selected index on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditable =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable ||
        !!target?.closest('[contenteditable="true"]');

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(!isSearchOpen);
      } else if (e.key === '/' && !isSearchOpen && !isEditable) {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape' && isSearchOpen) {
        setSearchOpen(false);
      } else if (isSearchOpen && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const selected = results[selectedIndex];
          if (selected) {
            onSelectPage(selected.id);
            setSearchOpen(false);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setSearchOpen, results, selectedIndex, onSelectPage]);

  const renderResultsList = (isMobileView: boolean) => (
    <div className={`${isMobileView ? 'max-h-[60vh]' : 'max-h-96'} overflow-y-auto p-2`}>
      {query.trim().length < 3 ? (
        <div className="py-12 text-center text-neutral-400 dark:text-zinc-500 text-xs flex flex-col items-center gap-2">
          <FileText className="w-7 h-7 text-neutral-300 dark:text-zinc-600 stroke-1" />
          <span>
            {query.trim().length === 0
              ? 'Type at least 3 characters to search document titles and content'
              : `Type ${3 - query.trim().length} more character${3 - query.trim().length > 1 ? 's' : ''} to start searching...`}
          </span>
        </div>
      ) : isLoading ? (
        <div className="py-8 text-center text-neutral-400 dark:text-zinc-500 text-xs flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>Fuzzy searching workspace...</span>
        </div>
      ) : results.length === 0 ? (
        <div className="py-10 text-center text-neutral-400 dark:text-zinc-500 text-xs">
          No matching pages found for "{query}"
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {results.map((res: any, idx: number) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={res.id}
                onClick={() => {
                  onSelectPage(res.id);
                  setSearchOpen(false);
                }}
                onMouseEnter={() => !isMobileView && setSelectedIndex(idx)}
                className={`group flex items-start gap-3 p-3 rounded-lg transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-stone-100 dark:bg-zinc-800 border-stone-300/80 dark:border-zinc-700 shadow-2xs'
                    : 'hover:bg-neutral-50 dark:hover:bg-zinc-800/40 border-transparent'
                }`}
              >
                <span className="text-xl leading-none mt-0.5 shrink-0">
                  {res.icon || '📄'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-neutral-900 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white transition-colors truncate">
                      <HighlightText text={res.title || 'Untitled'} query={query} />
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {res.matchType === 'title' ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/60 font-medium">
                          Title
                        </span>
                      ) : res.matchType === 'both' ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 font-medium">
                          Title &amp; Body
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 border border-stone-200 dark:border-zinc-700 font-medium">
                          Content
                        </span>
                      )}
                      <ArrowRight
                        className={`w-4 h-4 text-neutral-400 dark:text-zinc-500 transition-opacity ${
                          isSelected ? 'opacity-100 text-stone-800 dark:text-zinc-200' : 'opacity-0'
                        }`}
                      />
                    </div>
                  </div>
                  {res.snippet && (
                    <p className="text-xs text-neutral-500 dark:text-zinc-400 line-clamp-2 mt-0.5 font-normal leading-relaxed">
                      <HighlightText text={res.snippet} query={query} />
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // On Mobile: Apple-grade BottomSheet with drag-to-dismiss
  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isSearchOpen}
        onClose={() => setSearchOpen(false)}
        hideHeader
        maxHeight="max-h-[85vh]"
      >
        <div className="flex flex-col">
          {/* Search Bar Input */}
          <div className="flex items-center px-4 py-3 border-b border-stone-200/60 dark:border-zinc-800 bg-[#f8f7f4]/70 dark:bg-zinc-900/60 gap-3 shrink-0">
            <Search className="w-4 h-4 text-stone-400 dark:text-zinc-500 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full bg-transparent text-stone-900 dark:text-zinc-100 placeholder-stone-400 dark:placeholder-zinc-500 text-base font-medium focus:outline-none"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-xs text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200 px-2 py-1 rounded-md bg-stone-200/60 dark:bg-zinc-800 font-medium cursor-pointer transition-colors active-press"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="text-stone-400 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-200 p-2 rounded-lg hover:bg-stone-200/60 dark:hover:bg-zinc-800 cursor-pointer transition-colors active-press"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results list */}
          {renderResultsList(true)}
        </div>
      </BottomSheet>
    );
  }

  // On Desktop: Centered modal dialog
  return (
    <AnimatePresence>
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 select-none">
          {/* Backdrop click to dismiss */}
          <motion.div
            key="palette-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-stone-950/45 dark:bg-black/70 backdrop-blur-xs"
            onClick={() => setSearchOpen(false)}
          />

          {/* Modal Content */}
          <motion.div
            key="palette-card"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="relative z-10 w-full max-w-xl bg-[#fdfcf9] dark:bg-[#18181b] border border-stone-200/90 dark:border-zinc-800 rounded-xl shadow-[0_24px_70px_-15px_rgba(28,25,23,0.24),0_0_0_1px_rgba(28,25,23,0.06)] dark:shadow-[0_24px_70px_-15px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Bar Input */}
            <div className="flex items-center px-4 py-3 sm:py-3.5 border-b border-stone-200/60 dark:border-zinc-800 bg-[#f8f7f4]/70 dark:bg-zinc-900/60 gap-3 shrink-0">
              <Search className="w-4 h-4 text-stone-400 dark:text-zinc-500 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents, titles & content..."
                className="w-full bg-transparent text-stone-900 dark:text-zinc-100 placeholder-stone-400 dark:placeholder-zinc-500 text-base sm:text-sm font-medium focus:outline-none"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-xs text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200 px-2 py-1 rounded-md bg-stone-200/60 dark:bg-zinc-800 font-medium cursor-pointer transition-colors active-press"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-stone-400 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-200 p-2 rounded-lg hover:bg-stone-200/60 dark:hover:bg-zinc-800 cursor-pointer transition-colors active-press"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results Container */}
            {renderResultsList(false)}

            {/* Footer info */}
            <div className="px-4 py-2 border-t border-stone-200/50 dark:border-zinc-800 bg-stone-50/60 dark:bg-zinc-900/40 text-[11px] text-stone-500 dark:text-zinc-400 flex items-center justify-between font-mono">
              <div className="flex items-center gap-1.5" />
              <div className="flex items-center gap-3">
                <span>
                  <kbd className="font-mono bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 px-1 py-0.5 rounded text-[10px] text-stone-600 dark:text-zinc-300">
                    ↑↓
                  </kbd>{' '}
                  Navigate
                </span>
                <span>
                  <kbd className="font-mono bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 px-1 py-0.5 rounded text-[10px] text-stone-600 dark:text-zinc-300">
                    ↵
                  </kbd>{' '}
                  Select
                </span>
                <span>
                  <kbd className="font-mono bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 px-1 py-0.5 rounded text-[10px] text-stone-600 dark:text-zinc-300">
                    Esc
                  </kbd>{' '}
                  Close
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
