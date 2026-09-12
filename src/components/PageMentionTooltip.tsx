import React, { useEffect, useRef } from 'react';
import { FileText, AtSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getPageTree, type PageTreeNode } from '~/server/pages';
import { getSession } from '~/server/auth';

interface PageMentionTooltipProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPage: (page: { id: string; title: string; icon?: string | null }) => void;
  currentPageId?: string;
  searchQuery?: string;
  selectedIndex?: number;
  onHoverIndex?: (index: number) => void;
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
  searchQuery = '',
  selectedIndex = 0,
  onHoverIndex,
  position,
}) => {
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
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  if (!isOpen) return null;

  const style: React.CSSProperties = position
    ? {
        position: 'fixed',
        top: `${Math.min(position.top, window.innerHeight - 300)}px`,
        left: `${Math.min(position.left, window.innerWidth - 280)}px`,
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
      className="z-[9999] w-72 bg-white rounded-xl shadow-2xl border border-stone-200/90 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 select-none text-stone-900 pointer-events-auto"
    >
      {/* Header bar */}
      <div className="px-3 py-2 bg-stone-50 border-b border-stone-200/70 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
          <div className="w-4 h-4 rounded bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <AtSign className="w-3 h-3" />
          </div>
          <span>Mention Page</span>
        </div>
        <span className="text-[10px] font-mono text-stone-400">
          {searchQuery ? `Searching "${searchQuery}"` : 'Type page name'}
        </span>
      </div>

      {/* Results List */}
      <div className="max-h-56 overflow-y-auto p-1.5 flex flex-col gap-0.5">
        {filteredPages.length === 0 ? (
          <div className="py-5 text-center text-xs text-stone-400 flex flex-col items-center gap-1">
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
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelectPage(page);
                  onClose();
                }}
                onMouseEnter={() => onHoverIndex?.(index)}
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
