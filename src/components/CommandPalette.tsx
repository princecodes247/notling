import React, { useState, useEffect } from 'react';
import { Search, X, FileText, ArrowRight, Sparkles } from 'lucide-react';
import { useUIStore } from '~/store/uiStore';
import { useQuery } from '@tanstack/react-query';
import { searchPages } from '~/server/pages';

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

export const CommandPalette: React.FC<CommandPaletteProps> = ({ workspaceId, onSelectPage }) => {
  const { isSearchOpen, setSearchOpen } = useUIStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fetch search results via super fast fuzzy search (minimum 3 characters required)
  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', workspaceId, query],
    queryFn: async () => {
      if (query.trim().length < 3) return [];
      return await searchPages({ data: { workspaceId, query } });
    },
    enabled: isSearchOpen && query.trim().length >= 3,
    staleTime: 1000,
  });

  // Reset selection index when query or results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, results]);

  // Global keydown handler for Cmd+K / Ctrl+K, /, Esc, ArrowUp, ArrowDown, Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = document.activeElement as HTMLElement | null;
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

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start max-sm:items-end justify-center pt-16 max-sm:pt-0 px-4 max-sm:px-0 bg-stone-950/45 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      {/* Backdrop click to dismiss */}
      <div className="fixed inset-0" onClick={() => setSearchOpen(false)} />

      {/* Modal Content / Mobile Sheet */}
      <div className="relative z-10 w-full max-w-xl bg-[#fdfcf9] border border-stone-200/90 rounded-xl max-sm:rounded-t-[24px] max-sm:rounded-b-none shadow-[0_24px_70px_-15px_rgba(28,25,23,0.24),0_0_0_1px_rgba(28,25,23,0.06)] overflow-hidden flex flex-col max-sm:max-h-[90vh] animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">
        {/* iOS Drag Handle */}
        <div className="w-10 h-1 rounded-full bg-stone-300 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Search Bar Input */}
        <div className="flex items-center px-4 py-3 sm:py-3.5 border-b border-stone-200/60 bg-[#f8f7f4]/70 gap-3 shrink-0">
          <Search className="w-4 h-4 text-stone-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents, titles & content..."
            className="w-full bg-transparent text-stone-900 placeholder-stone-400 text-base sm:text-sm font-medium focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs text-stone-500 hover:text-stone-800 px-2 py-1 rounded-md bg-stone-200/60 font-medium cursor-pointer transition-colors active-press"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            className="text-stone-400 hover:text-stone-700 p-2 rounded-lg hover:bg-stone-200/60 cursor-pointer transition-colors active-press"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-2">
          {query.trim().length < 3 ? (
            <div className="py-12 text-center text-neutral-400 text-xs flex flex-col items-center gap-2">
              <FileText className="w-7 h-7 text-neutral-300 stroke-1" />
              <span>
                {query.trim().length === 0
                  ? 'Type at least 3 characters to search document titles and content'
                  : `Type ${3 - query.trim().length} more character${3 - query.trim().length > 1 ? 's' : ''} to start searching...`}
              </span>
            </div>
          ) : isLoading ? (
            <div className="py-8 text-center text-neutral-400 text-xs flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span>Fuzzy searching workspace...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-10 text-center text-neutral-400 text-xs">
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
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`group flex items-start gap-3 p-3 rounded-lg transition-all cursor-pointer border ${isSelected
                        ? 'bg-stone-100 border-stone-300/80 shadow-2xs'
                        : 'hover:bg-neutral-50 border-transparent'
                      }`}
                  >
                    <span className="text-xl leading-none mt-0.5 shrink-0">
                      {res.icon || '📄'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-neutral-900 group-hover:text-black transition-colors truncate">
                          <HighlightText text={res.title || 'Untitled'} query={query} />
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {res.matchType === 'title' ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200/80 font-medium">
                              Title
                            </span>
                          ) : res.matchType === 'both' ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-medium">
                              Title &amp; Body
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 border border-stone-200 font-medium">
                              Content
                            </span>
                          )}
                          <ArrowRight className={`w-4 h-4 text-neutral-400 transition-opacity ${isSelected ? 'opacity-100 text-stone-800' : 'opacity-0'}`} />
                        </div>
                      </div>
                      {res.snippet && (
                        <p className="text-xs text-neutral-500 line-clamp-2 mt-0.5 font-normal leading-relaxed">
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

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-stone-200/50 bg-stone-50/60 text-[11px] text-stone-500 flex items-center justify-between font-mono">
          <div className="flex items-center gap-1.5">

          </div>
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono bg-white border border-stone-200 px-1 py-0.5 rounded text-[10px]">↑↓</kbd> Navigate</span>
            <span><kbd className="font-mono bg-white border border-stone-200 px-1 py-0.5 rounded text-[10px]">↵</kbd> Select</span>
            <span><kbd className="font-mono bg-white border border-stone-200 px-1 py-0.5 rounded text-[10px]">Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
