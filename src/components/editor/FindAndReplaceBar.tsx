import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  ChevronUp,
  ChevronDown,
  X,
  CaseSensitive,
  WholeWord,
  Replace,
  ChevronRight,
} from 'lucide-react';
import type { BlockNoteEditor } from '@blocknote/core';
import {
  findMatchesInDoc,
  ensureSearchPlugin,
  updateSearchDecorations,
  clearSearchDecorations,
  scrollToMatch,
  replaceMatch,
  replaceAllMatches,
  type SearchMatch,
  type SearchOptions,
} from './findReplacePlugin';

interface FindAndReplaceBarProps {
  editor: BlockNoteEditor;
  isOpen: boolean;
  initialMode?: 'find' | 'replace';
  initialQuery?: string;
  readOnly?: boolean;
  onClose: () => void;
}

export const FindAndReplaceBar: React.FC<FindAndReplaceBarProps> = ({
  editor,
  isOpen,
  initialMode = 'find',
  initialQuery = '',
  readOnly = false,
  onClose,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [replacement, setReplacement] = useState('');
  const [isReplaceMode, setIsReplaceMode] = useState(!readOnly && initialMode === 'replace');

  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync mode and query when reopened
  useEffect(() => {
    if (isOpen) {
      if (initialQuery) {
        setQuery(initialQuery);
      }
      const shouldBeReplace = !readOnly && initialMode === 'replace';
      setIsReplaceMode(shouldBeReplace);
      setTimeout(() => {
        if (shouldBeReplace) {
          replaceInputRef.current?.focus();
          replaceInputRef.current?.select();
        } else {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }
      }, 30);
    }
  }, [isOpen, initialMode, initialQuery, readOnly]);


  // Run search and update decorations
  const performSearch = useCallback(
    (searchQuery: string, options: SearchOptions, targetIndex?: number) => {
      if (!isOpen || !editor) return;
      ensureSearchPlugin(editor);

      const currentView = (editor as any)?.prosemirrorView || (editor as any)?._tiptapEditor?.view;
      if (!currentView) return;

      const doc = currentView.state.doc;
      const foundMatches = findMatchesInDoc(doc, searchQuery, options);
      setMatches(foundMatches);

      if (foundMatches.length === 0) {
        setActiveIndex(-1);
        updateSearchDecorations(currentView, [], -1);
        return;
      }

      let newIndex = 0;
      if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < foundMatches.length) {
        newIndex = targetIndex;
      } else if (activeIndex >= 0 && activeIndex < foundMatches.length) {
        newIndex = activeIndex;
      }

      setActiveIndex(newIndex);
      updateSearchDecorations(currentView, foundMatches, newIndex);
      scrollToMatch(currentView, foundMatches[newIndex]);
    },
    [editor, isOpen, activeIndex]
  );

  // Trigger search on query or option change
  useEffect(() => {
    if (!isOpen) return;
    performSearch(query, { caseSensitive, wholeWord }, 0);
  }, [query, caseSensitive, wholeWord, isOpen, performSearch]);

  // Listen to doc changes from editor to keep matches up to date
  useEffect(() => {
    if (!isOpen || !editor) return;

    const handleUpdate = () => {
      performSearch(query, { caseSensitive, wholeWord });
    };

    const tt = (editor as any)?._tiptapEditor;
    if (tt) {
      tt.on('update', handleUpdate);
      return () => {
        tt.off('update', handleUpdate);
      };
    }
  }, [editor, isOpen, query, caseSensitive, wholeWord, performSearch]);

  const getView = useCallback(
    () => (editor as any)?.prosemirrorView || (editor as any)?._tiptapEditor?.view,
    [editor]
  );

  // Clean up decorations on close or unmount
  const handleClose = useCallback(() => {
    const v = getView();
    if (v) {
      clearSearchDecorations(v);
    }
    setMatches([]);
    setActiveIndex(-1);
    onClose();
    // Return focus to editor
    try {
      editor.focus();
    } catch {}
  }, [getView, editor, onClose]);

  // Navigation handlers
  const handleNextMatch = useCallback(() => {
    const v = getView();
    if (matches.length === 0 || !v) return;
    const nextIdx = (activeIndex + 1) % matches.length;
    setActiveIndex(nextIdx);
    updateSearchDecorations(v, matches, nextIdx);
    scrollToMatch(v, matches[nextIdx]);
  }, [matches, activeIndex, getView]);

  const handlePrevMatch = useCallback(() => {
    const v = getView();
    if (matches.length === 0 || !v) return;
    const prevIdx = (activeIndex - 1 + matches.length) % matches.length;
    setActiveIndex(prevIdx);
    updateSearchDecorations(v, matches, prevIdx);
    scrollToMatch(v, matches[prevIdx]);
  }, [matches, activeIndex, getView]);

  // Replace handlers
  const handleReplaceCurrent = useCallback(() => {
    const v = getView();
    if (!v || matches.length === 0 || activeIndex < 0) return;
    const currentMatch = matches[activeIndex];
    replaceMatch(v, currentMatch, replacement);

    // Re-run search and stay at current index (or next match)
    setTimeout(() => {
      performSearch(query, { caseSensitive, wholeWord }, activeIndex);
    }, 10);
  }, [getView, matches, activeIndex, replacement, query, caseSensitive, wholeWord, performSearch]);

  const handleReplaceAll = useCallback(() => {
    const v = getView();
    if (!v || matches.length === 0) return;
    replaceAllMatches(v, matches, replacement);

    // Clear matches after replacing all
    setTimeout(() => {
      performSearch(query, { caseSensitive, wholeWord });
    }, 10);
  }, [getView, matches, replacement, query, caseSensitive, wholeWord, performSearch]);

  // Keyboard navigation inside search panel
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrevMatch();
      } else {
        handleNextMatch();
      }
    } else if (e.key === 'ArrowDown' && isReplaceMode) {
      e.preventDefault();
      replaceInputRef.current?.focus();
    }
  };

  const handleReplaceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey || e.altKey) {
        handleReplaceAll();
      } else {
        handleReplaceCurrent();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
  };

  if (!isOpen) return null;

  const matchCountText = (() => {
    if (!query) return '';
    if (matches.length === 0) return 'No results';
    return `${activeIndex + 1} of ${matches.length}`;
  })();

  return (
    <div
      ref={containerRef}
      role="search"
      aria-label="Find and Replace"
      className="fixed top-14 right-3 sm:right-6 z-40 w-[360px] max-w-[calc(100vw-24px)] rounded-xl bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border border-stone-200/90 dark:border-zinc-800 shadow-xl p-2 select-none text-xs text-stone-700 dark:text-zinc-200 animate-in fade-in-50 zoom-in-95 duration-150"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleClose();
        } else if (e.altKey && (e.key === 'c' || e.key === 'C')) {
          e.preventDefault();
          setCaseSensitive((prev) => !prev);
        } else if (e.altKey && (e.key === 'w' || e.key === 'W')) {
          e.preventDefault();
          setWholeWord((prev) => !prev);
        }
      }}
    >
      {/* Row 1: Search bar */}
      <div className="flex items-center gap-1.5">
        {/* Toggle Replace Mode Button */}
        {!readOnly && (
          <button
            type="button"
            onClick={() => setIsReplaceMode((prev) => !prev)}
            title={isReplaceMode ? 'Collapse Replace' : 'Expand Replace (⌘H)'}
            aria-label={isReplaceMode ? 'Collapse Replace' : 'Expand Replace'}
            className="p-1 rounded-md hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200 transition-colors cursor-pointer active:scale-95 shrink-0"
          >
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                isReplaceMode ? 'rotate-90' : ''
              }`}
            />
          </button>
        )}

        {/* Search Input Container */}
        <div className="flex-1 min-w-0 relative flex items-center bg-stone-100/80 dark:bg-zinc-800/80 rounded-lg px-2 py-1.5 border border-transparent focus-within:border-stone-400 dark:focus-within:border-zinc-600 focus-within:bg-white dark:focus-within:bg-[#18181b] transition-all">
          <Search className="w-3.5 h-3.5 text-stone-400 dark:text-zinc-500 mr-1.5 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Find in page..."
            className="w-full bg-transparent border-none p-0 focus:outline-none text-xs text-stone-800 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500"
          />

          {/* Match Counter Badge */}
          {query && (
            <span
              className={`ml-1 text-[11px] font-mono tabular-nums px-1 rounded shrink-0 select-none ${
                matches.length > 0
                  ? 'text-stone-500 dark:text-zinc-400'
                  : 'text-rose-500 dark:text-rose-400 font-medium'
              }`}
            >
              {matchCountText}
            </span>
          )}
        </div>

        {/* Case Sensitive Toggle */}
        <button
          type="button"
          onClick={() => setCaseSensitive((prev) => !prev)}
          title="Match Case (Alt+C)"
          aria-pressed={caseSensitive}
          className={`p-1.5 rounded-md transition-all cursor-pointer active:scale-95 shrink-0 ${
            caseSensitive
              ? 'bg-stone-200 dark:bg-zinc-700 text-stone-900 dark:text-white font-bold ring-1 ring-stone-300 dark:ring-zinc-600'
              : 'hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-400 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-300'
          }`}
        >
          <CaseSensitive className="w-3.5 h-3.5" />
        </button>

        {/* Whole Word Toggle */}
        <button
          type="button"
          onClick={() => setWholeWord((prev) => !prev)}
          title="Match Whole Word (Alt+W)"
          aria-pressed={wholeWord}
          className={`p-1.5 rounded-md transition-all cursor-pointer active:scale-95 shrink-0 ${
            wholeWord
              ? 'bg-stone-200 dark:bg-zinc-700 text-stone-900 dark:text-white font-bold ring-1 ring-stone-300 dark:ring-zinc-600'
              : 'hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-400 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-300'
          }`}
        >
          <WholeWord className="w-3.5 h-3.5" />
        </button>

        {/* Prev Match Button */}
        <button
          type="button"
          onClick={handlePrevMatch}
          disabled={matches.length === 0}
          title="Previous Match (Shift+Enter)"
          aria-label="Previous Match"
          className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer active:scale-95 shrink-0"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>

        {/* Next Match Button */}
        <button
          type="button"
          onClick={handleNextMatch}
          disabled={matches.length === 0}
          title="Next Match (Enter)"
          aria-label="Next Match"
          className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer active:scale-95 shrink-0"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          title="Close (Escape)"
          aria-label="Close find bar"
          className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 transition-colors cursor-pointer active:scale-95 shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Row 2: Replace bar (collapsible) */}
      {isReplaceMode && (
        <div className="mt-2 pt-2 border-t border-stone-200/60 dark:border-zinc-800/80 flex items-center gap-1.5 animate-in fade-in-50 slide-in-from-top-1 duration-150">
          <div className="w-5 shrink-0 flex justify-center text-stone-400 dark:text-zinc-500">
            <Replace className="w-3.5 h-3.5" />
          </div>

          {/* Replace Input Container */}
          <div className="flex-1 min-w-0 flex items-center bg-stone-100/80 dark:bg-zinc-800/80 rounded-lg px-2 py-1.5 border border-transparent focus-within:border-stone-400 dark:focus-within:border-zinc-600 focus-within:bg-white dark:focus-within:bg-[#18181b] transition-all">
            <input
              ref={replaceInputRef}
              type="text"
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              onKeyDown={handleReplaceKeyDown}
              placeholder="Replace with..."
              className="w-full bg-transparent border-none p-0 focus:outline-none text-xs text-stone-800 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500"
            />
          </div>

          {/* Replace Single Button */}
          <button
            type="button"
            onClick={handleReplaceCurrent}
            disabled={matches.length === 0}
            title="Replace current match (Enter)"
            className="px-2 py-1.5 rounded-lg bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-200 font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95 shrink-0"
          >
            Replace
          </button>

          {/* Replace All Button */}
          <button
            type="button"
            onClick={handleReplaceAll}
            disabled={matches.length === 0}
            title="Replace all matches (Alt+Enter)"
            className="px-2 py-1.5 rounded-lg bg-[#1f4d3d] hover:bg-[#183e31] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95 shrink-0"
          >
            All
          </button>
        </div>
      )}
    </div>
  );
};
