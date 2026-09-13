import React, { useEffect, useRef } from 'react';
import { FileText, AtSign, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getPageTree, getWorkspaceUsers, type PageTreeNode } from '~/server/pages';
import { getSession } from '~/server/auth';
import { UserAvatar } from '~/components/UserAvatar';

export interface MentionSuggestionItem {
  type: 'page' | 'user';
  id: string;
  title: string;
  subtitle?: string;
  icon?: string | null;
  email?: string;
}

interface PageMentionTooltipProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: MentionSuggestionItem) => void;
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
  onSelectItem,
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

  const { data: workspaceUsers = [] } = useQuery({
    queryKey: ['workspaceUsers', workspaceId],
    queryFn: async () => await getWorkspaceUsers({ data: workspaceId }),
  });

  // Prepare user items
  const userItems: MentionSuggestionItem[] = workspaceUsers.map((u) => ({
    type: 'user',
    id: u.id,
    title: u.name || u.email.split('@')[0],
    subtitle: u.email,
    icon: u.avatarUrl,
    email: u.email,
  }));

  // Prepare page items
  const pageItems: MentionSuggestionItem[] = flattenPageTree(treeNodes)
    .filter((p) => p.id !== currentPageId)
    .map((p) => ({
      type: 'page',
      id: p.id,
      title: p.title,
      icon: p.icon,
    }));

  const cleanQuery = searchQuery.toLowerCase().trim();

  const filteredUsers = userItems.filter(
    (u) => u.title.toLowerCase().includes(cleanQuery) || (u.subtitle && u.subtitle.toLowerCase().includes(cleanQuery))
  );

  const filteredPages = pageItems.filter((p) => p.title.toLowerCase().includes(cleanQuery));

  const allFilteredSuggestions: MentionSuggestionItem[] = [...filteredUsers, ...filteredPages];

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
      top: `${Math.min(position.top, window.innerHeight - 340)}px`,
      left: `${Math.min(position.left, window.innerWidth - 290)}px`,
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
      className="z-[9999] w-72 bg-white dark:bg-[#18181b] rounded-xl shadow-2xl border border-stone-200/90 dark:border-zinc-800 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 select-none text-stone-900 dark:text-zinc-100 pointer-events-auto"
    >
      {/* Header bar */}
      <div className="px-3 py-2 bg-stone-50 dark:bg-zinc-900/60 border-b border-stone-200/70 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-zinc-300">
          <div className="w-4 h-4 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AtSign className="w-3 h-3" />
          </div>
          <span>Mention User or Page</span>
        </div>
        <span className="text-[10px] font-mono text-stone-400 dark:text-zinc-500">
          {searchQuery ? `Searching "${searchQuery}"` : 'Type name or title'}
        </span>
      </div>

      {/* Results List */}
      <div className="max-h-60 overflow-y-auto p-1.5 flex flex-col gap-1">
        {allFilteredSuggestions.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400 dark:text-zinc-500 flex flex-col items-center gap-1">
            <FileText className="w-4 h-4 text-stone-300 dark:text-zinc-600 stroke-1" />
            <span>No matching users or pages</span>
          </div>
        ) : (
          <>

            {/* Pages section */}
            {filteredPages.length > 0 && (
              <div className="flex flex-col gap-0.5 mt-1">
                <div className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-stone-400 dark:text-zinc-500 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-stone-400 dark:text-zinc-500" />
                  <span>Pages ({filteredPages.length})</span>
                </div>
                {filteredPages.map((page) => {
                  const index = allFilteredSuggestions.findIndex((s) => s.id === page.id);
                  const isSelected = index === selectedIndex;
                  return (
                    <button
                      key={page.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onSelectItem(page);
                        onClose();
                      }}
                      onMouseEnter={() => onHoverIndex?.(index)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer group ${isSelected ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-950 dark:text-amber-200 font-medium' : 'hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-800 dark:text-zinc-200'
                        }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm shrink-0">{page.icon || '📄'}</span>
                        <span className={`text-xs truncate ${isSelected ? 'font-semibold text-amber-900 dark:text-amber-300' : 'text-stone-800 dark:text-zinc-200'}`}>
                          {page.title}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/60 px-1.5 py-0.2 rounded shrink-0">
                          ↵
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {/* Users section */}
            {filteredUsers.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <div className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-stone-400 dark:text-zinc-500 flex items-center gap-1">
                  <User className="w-3 h-3 text-stone-400 dark:text-zinc-500" />
                  <span>Members ({filteredUsers.length})</span>
                </div>
                {filteredUsers.map((user) => {
                  const index = allFilteredSuggestions.findIndex((s) => s.id === user.id);
                  const isSelected = index === selectedIndex;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onSelectItem(user);
                        onClose();
                      }}
                      onMouseEnter={() => onHoverIndex?.(index)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer group ${isSelected ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 font-medium' : 'hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-800 dark:text-zinc-200'
                        }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <UserAvatar
                          avatarUrl={user.icon}
                          seed={user.id}
                          name={user.title}
                          size={20}
                          className="w-5 h-5"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className={`text-xs truncate ${isSelected ? 'font-semibold text-emerald-900 dark:text-emerald-300' : 'text-stone-800 dark:text-zinc-200'}`}>
                            {user.title}
                          </span>
                          {user.subtitle && (
                            <span className="text-[10px] text-stone-400 dark:text-zinc-500 truncate font-mono">
                              {user.subtitle}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded shrink-0">
                          ↵
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}


          </>
        )}
      </div>
    </div>
  );
};
