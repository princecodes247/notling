import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, AtSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getPageTree, type PageTreeNode } from '~/server/pages';
import { getSession } from '~/server/auth';

interface PageMentionTooltipProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPage: (page: { id: string; title: string; icon?: string | null }) => void;
  currentPageId?: string;
  position?: { top: number; left: number } | null;
}

function flattenPageTree(nodes: PageTreeNode[]): Array<{ id: string; title: string; icon?: string | null; isFolder?: boolean }> {
  const result: Array<{ id: string; title: string; icon?: string | null; isFolder?: boolean }> = [];
  function recurse(list: PageTreeNode[]) {
    for (const node of list) {
      const isFolder = node.icon === '📁' || node.icon === '📂';
      result.push({
        id: node.id,
        title: node.title || 'Untitled Page',
        icon: node.icon,
        isFolder,
      });
      if (node.children && node.children.length > 0) {
        recurse(node.children);
      }
    }
  }
  recurse(nodes);
  return result;
}

export const PageMentionTooltip: React.FC<PageMentionTooltipProps> = ({
  isOpen,
  onClose,
  onSelectPage,
  currentPageId,
  position,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: () => getSession(),
  });

  const workspaceId = session?.workspaceId || '';

  const { data: treeNodes = [] } = useQuery({
    queryKey: ['pageTree', workspaceId],
    queryFn: () => getPageTree({ data: workspaceId }),
    enabled: Boolean(workspaceId),
  });

  const allPages = flattenPageTree(treeNodes).filter((p) => p.id !== currentPageId);

  const filteredPages = allPages.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredPages.length > 0 ? (prev + 1) % filteredPages.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredPages.length > 0 ? (prev - 1 + filteredPages.length) % filteredPages.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredPages[selectedIndex]) {
        onSelectPage(filteredPages[selectedIndex]);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  // Positioning style
  const style: React.CSSProperties = position
    ? {
        position: 'fixed',
        top: `${Math.min(position.top, window.innerHeight - 320)}px`,
        left: `${Math.min(position.left, window.innerWidth - 300)}px`,
      }
    : {
        position: 'fixed',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
      };

  return (
    <div
      ref={containerRef}
      style={style}
      onKeyDown={handleKeyDown}
      className="z-[9999] w-72 bg-white rounded-xl shadow-2xl border border-stone-200/90 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 select-none text-stone-900"
    >
      {/* Header bar */}
      <div className="px-3 py-2 bg-stone-50 border-b border-stone-200/70 flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
          <AtSign className="w-3 h-3" />
        </div>
        <span className="text-xs font-semibold text-stone-700">Link Page</span>
        <span className="text-[10px] font-mono text-stone-400 ml-auto">Esc to cancel</span>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-stone-100">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-stone-100/70 border border-stone-200 focus-within:border-amber-400 focus-within:bg-white transition-colors">
          <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search page..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-stone-900 placeholder-stone-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Results List */}
      <div className="max-h-56 overflow-y-auto p-1.5 flex flex-col gap-0.5">
        {filteredPages.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400 flex flex-col items-center gap-1">
            <FileText className="w-4 h-4 text-stone-300 stroke-1" />
            <span>No matching pages</span>
          </div>
        ) : (
          filteredPages.map((page, index) => {
            const isSelected = index === selectedIndex;
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => {
                  onSelectPage(page);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer group ${
                  isSelected ? 'bg-amber-50 text-amber-950 font-medium' : 'hover:bg-stone-100 text-stone-800'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">{page.icon || (page.isFolder ? '📁' : '📄')}</span>
                  <span className={`text-xs truncate ${isSelected ? 'font-semibold text-amber-900' : 'text-stone-800'}`}>
                    {page.title}
                  </span>
                </div>
                {isSelected && (
                  <span className="text-[10px] font-mono text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded shrink-0">
                    ↵
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
