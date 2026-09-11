import React, { useState, useEffect } from 'react';
import { Search, X, FileText, ArrowRight } from 'lucide-react';
import { useUIStore } from '~/store/uiStore';
import { useQuery } from '@tanstack/react-query';
import { searchPages } from '~/server/pages';

interface CommandPaletteProps {
  workspaceId: string;
  onSelectPage: (pageId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ workspaceId, onSelectPage }) => {
  const { isSearchOpen, setSearchOpen } = useUIStore();
  const [query, setQuery] = useState('');

  // Global keydown handler for Cmd+K / Ctrl+K, / and Esc
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setSearchOpen]);

  // Fetch search results via Postgres full-text search
  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', workspaceId, query],
    queryFn: async () => {
      if (!query.trim()) return [];
      return await searchPages({ data: { workspaceId, query } });
    },
    enabled: isSearchOpen && query.trim().length > 0,
    staleTime: 5000,
  });

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-stone-950/40 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Backdrop click to dismiss */}
      <div className="fixed inset-0" onClick={() => setSearchOpen(false)} />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-xl bg-[#fdfcf9] border border-stone-200/90 rounded-xl shadow-[0_24px_70px_-15px_rgba(28,25,23,0.24),0_0_0_1px_rgba(28,25,23,0.06)] overflow-hidden flex flex-col">
        {/* Search Bar Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-stone-200/60 bg-[#f8f7f4]/70 gap-3">
          <Search className="w-4 h-4 text-stone-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents and content..."
            className="w-full bg-transparent text-stone-900 placeholder-stone-400 text-sm font-medium focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs text-stone-500 hover:text-stone-800 px-2 py-0.5 rounded-md bg-stone-200/60 font-medium cursor-pointer transition-colors"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-md hover:bg-stone-200/60 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-2">
          {query.trim() === '' ? (
            <div className="py-12 text-center text-neutral-400 text-xs flex flex-col items-center gap-2">
              <FileText className="w-7 h-7 text-neutral-300 stroke-1" />
              <span>Type a search query to scan document titles and contents</span>
            </div>
          ) : isLoading ? (
            <div className="py-8 text-center text-neutral-400 text-xs">
              Searching PostgreSQL full-text index...
            </div>
          ) : results.length === 0 ? (
            <div className="py-10 text-center text-neutral-400 text-xs">
              No matching pages found for "{query}"
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {results.map((res: { id: string; title: string; icon?: string | null; contentText?: string | null }) => (
                <div
                  key={res.id}
                  onClick={() => {
                    onSelectPage(res.id);
                    setSearchOpen(false);
                  }}
                  className="group flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer border border-transparent hover:border-neutral-200"
                >
                  <span className="text-xl leading-none mt-0.5 shrink-0">
                    {res.icon || '📄'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-neutral-900 group-hover:text-black transition-colors truncate">
                        {res.title || 'Untitled'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                    </div>
                    {res.contentText && (
                      <p className="text-xs text-neutral-500 line-clamp-2 mt-0.5 font-normal leading-relaxed">
                        {res.contentText}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-neutral-100 bg-neutral-50 text-[11px] text-neutral-400 flex items-center justify-between">
          <span>PostgreSQL GIN Full-Text Index</span>
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono bg-white border border-neutral-200 px-1 py-0.5 rounded text-[10px]">Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
