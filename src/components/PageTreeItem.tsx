import React, { useState } from 'react';
import { Star, ChevronRight, ChevronDown, Plus, FileText, Copy } from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Delete02Icon,
  Edit02Icon,
  MoreHorizontalIcon,
  Download01Icon,
} from '@hugeicons/core-free-icons';
import type { PageTreeNode } from '~/server/pages';
import { getPage } from '~/server/pages';
import { useUIStore } from '~/store/uiStore';
import { useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { EmojiPicker } from './EmojiPicker';
import { exportPageToMarkdown } from '~/lib/pageExport';
import { inferEmojiFromTitle, isDefaultOrInferredIcon } from '~/lib/emojiUtils';
import { updateClientPageMeta } from '~/lib/pageMetaSync';


interface PageTreeItemProps {
  node: PageTreeNode;
  depth?: number;
  onCreateChild: (parentId: string) => void;
  onSelectPage: (pageId: string) => void;
  onSoftDelete: (pageId: string) => void;
  onUpdateMeta: (pageId: string, title: string, icon?: string) => void;
  onReorderPage?: (input: { pageId: string; targetParentId: string | null; targetOrder: number }) => void;
  onTogglePin?: (pageId: string) => void;
  onDuplicatePage?: (pageId: string) => void;
  draggedPageId?: string | null;
  setDraggedPageId?: (id: string | null) => void;
}

export const PageTreeItem: React.FC<PageTreeItemProps> = ({
  node,
  depth = 0,
  onCreateChild,
  onSelectPage,
  onSoftDelete,
  onUpdateMeta,
  onReorderPage,
  onTogglePin,
  onDuplicatePage,
  draggedPageId,
  setDraggedPageId,
}) => {
  const queryClient = useQueryClient();
  const { expandedNodeIds, toggleNodeExpand, setNodeExpand, activePageId } = useUIStore();

  const handleMouseEnter = () => {
    queryClient.query({
      queryKey: ['page', node.id],
      queryFn: async () => await getPage({ data: node.id }),
      staleTime: 5 * 60 * 1000,
    });
  };
  const liveMeta = useUIStore((s) => s.pageMeta[node.id]);
  const displayTitle = liveMeta?.title ?? node.title;
  const rawIcon = liveMeta?.icon ?? node.icon;
  const hasCustomEmoji = Boolean(rawIcon && rawIcon !== '📄');
  const displayIcon = hasCustomEmoji ? rawIcon : '📄';

  const isExpanded = !!expandedNodeIds[node.id];
  const isActive = activePageId === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const canEdit = node.canEdit !== false;
  const canDelete = node.canDelete === true;

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(displayTitle);
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [dropTargetMode, setDropTargetMode] = useState<'above' | 'below' | 'inside' | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<'duplicating' | 'deleting' | 'creating' | null>(null);

  React.useEffect(() => {
    if (!isEditing) {
      setEditTitle(displayTitle);
    }
  }, [displayTitle, isEditing]);

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDuplicatePage || isProcessingAction) return;
    setShowMenu(false);
    setIsProcessingAction('duplicating');
    try {
      await Promise.resolve(onDuplicatePage(node.id));
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessingAction) return;
    setShowMenu(false);
    setIsProcessingAction('deleting');
    try {
      await Promise.resolve(onSoftDelete(node.id));
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleCreateChild = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessingAction) return;
    setIsProcessingAction('creating');
    try {
      await Promise.resolve(onCreateChild(node.id));
    } finally {
      setIsProcessingAction(null);
    }
  };

  const isDraggingCurrent = draggedPageId === node.id;

  const pendingTreeSaveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTitleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (pendingTreeSaveTimeoutRef.current) {
      clearTimeout(pendingTreeSaveTimeoutRef.current);
      pendingTreeSaveTimeoutRef.current = null;
    }
    const trimmed = editTitle.trim();
    if (trimmed && (trimmed !== node.title || displayIcon !== (node.icon || '📄'))) {
      const isFolderNode = rawIcon === '📁' || rawIcon === '📂';
      let targetIcon = displayIcon;
      if (isDefaultOrInferredIcon(rawIcon, displayTitle, { isFolder: isFolderNode })) {
        targetIcon = inferEmojiFromTitle(trimmed, { isFolder: isFolderNode });
      }
      updateClientPageMeta(queryClient, {
        pageId: node.id,
        title: trimmed,
        icon: targetIcon,
      });
      onUpdateMeta(node.id, trimmed, targetIcon);
    }
    setIsEditing(false);
  };



  const handleSelectIcon = (selectedIcon: string) => {
    setShowEmojiPicker(false);
    onUpdateMeta(node.id, displayTitle, selectedIcon);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedPageId?.(node.id);
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedPageId || draggedPageId === node.id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const height = rect.height;

    if (offsetY < height * 0.25) {
      setDropTargetMode('above');
    } else if (offsetY > height * 0.75) {
      setDropTargetMode('below');
    } else {
      setDropTargetMode('inside');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetMode(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedPageId || draggedPageId === node.id || !dropTargetMode) {
      setDropTargetMode(null);
      setDraggedPageId?.(null);
      return;
    }

    if (dropTargetMode === 'inside') {
      setNodeExpand(node.id, true);
      onReorderPage?.({
        pageId: draggedPageId,
        targetParentId: node.id,
        targetOrder: node.children?.length || 0,
      });
    } else if (dropTargetMode === 'above') {
      onReorderPage?.({
        pageId: draggedPageId,
        targetParentId: node.parentId,
        targetOrder: Math.max(0, node.order),
      });
    } else if (dropTargetMode === 'below') {
      onReorderPage?.({
        pageId: draggedPageId,
        targetParentId: node.parentId,
        targetOrder: node.order + 1,
      });
    }

    setDropTargetMode(null);
    setDraggedPageId?.(null);
  };

  const handleDragEnd = () => {
    setDropTargetMode(null);
    setDraggedPageId?.(null);
  };

  return (
    <div className="select-none text-xs">
      <div
        draggable={canEdit}
        onDragStart={canEdit ? handleDragStart : undefined}
        onDragOver={canEdit ? handleDragOver : undefined}
        onDragLeave={canEdit ? handleDragLeave : undefined}
        onDrop={canEdit ? handleDrop : undefined}
        onDragEnd={canEdit ? handleDragEnd : undefined}
        className={clsx(
          'group relative flex items-center justify-between px-2.5 py-1 rounded-md transition-all duration-150 cursor-pointer my-0.5',
          isDraggingCurrent
            ? 'opacity-40 border border-dashed border-stone-400 dark:border-zinc-600 bg-stone-100 dark:bg-zinc-800'
            : isActive
              ? 'bg-stone-200/80 dark:bg-zinc-800 text-stone-900 dark:text-white font-medium shadow-2xs'
              : dropTargetMode === 'inside'
                ? 'bg-stone-200/90 dark:bg-zinc-700/80 ring-1 ring-stone-400 dark:ring-zinc-500 text-stone-900 dark:text-white font-medium'
                : 'text-stone-600 dark:text-zinc-400 hover:bg-stone-200/50 dark:hover:bg-zinc-800/50 hover:text-stone-900 dark:hover:text-white'
        )}
        onClick={() => onSelectPage(node.id)}
        onMouseEnter={handleMouseEnter}
      >
        {/* Drop Line Indicators */}
        {dropTargetMode === 'above' && (
          <div className="absolute top-0 left-1 right-1 h-0.5 bg-stone-900 dark:bg-white z-30 rounded-full pointer-events-none" />
        )}
        {dropTargetMode === 'below' && (
          <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-stone-900 dark:bg-white z-30 rounded-full pointer-events-none" />
        )}

        {/* Left Side: Toggle Chevron + Icon + Title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            className={clsx(
              'pl-0.5 pr-0 rounded text-stone-400 dark:text-zinc-500 hover:text-stone-800 dark:hover:text-zinc-200 transition-transform shrink-0',
              !hasChildren && 'hidden opacity-0 max-w-0 pointer-events-none'
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleNodeExpand(node.id);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-stone-400 dark:text-zinc-500 shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-stone-400 dark:text-zinc-500 shrink-0" />
            )}
          </button>

          {/* Page Icon with interactive emoji picker */}
          <div className="relative shrink-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {canEdit ? (
              <button
                type="button"
                className="leading-none shrink-0 p-0.5 rounded hover:bg-stone-200/60 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer flex items-center justify-center"
                title="Change icon"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                {hasCustomEmoji ? (
                  <span className="text-sm leading-none shrink-0 select-none">{displayIcon}</span>
                ) : (
                  <FileText className={clsx("w-3.5 h-3.5 shrink-0", isActive ? "text-stone-900 dark:text-white" : "text-stone-400 dark:text-zinc-500")} />
                )}
              </button>
            ) : (
              <span className="leading-none shrink-0 p-0.5 select-none flex items-center justify-center">
                {hasCustomEmoji ? (
                  <span className="text-sm leading-none shrink-0 select-none">{displayIcon}</span>
                ) : (
                  <FileText className={clsx("w-3.5 h-3.5 shrink-0", isActive ? "text-stone-900 dark:text-white" : "text-stone-400 dark:text-zinc-500")} />
                )}
              </span>
            )}

            {canEdit && showEmojiPicker && (
              <EmojiPicker
                onSelect={(selectedEmoji) => handleSelectIcon(selectedEmoji)}
                onClose={() => setShowEmojiPicker(false)}
                currentEmoji={displayIcon}
                onRemove={() => handleSelectIcon('📄')}
                className="left-0 top-6"
              />
            )}
          </div>

          {isEditing && canEdit ? (
            <form onSubmit={handleTitleSubmit} className="flex-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditTitle(val);
                  const isFolderNode = rawIcon === '📁' || rawIcon === '📂';
                  let inferred = displayIcon;
                  if (isDefaultOrInferredIcon(rawIcon, displayTitle, { isFolder: isFolderNode })) {
                    inferred = inferEmojiFromTitle(val, { isFolder: isFolderNode });
                  }
                  // 1. Instant client-side UI update (Zustand + query cache) — NO DB API call!
                  updateClientPageMeta(queryClient, {
                    pageId: node.id,
                    title: val,
                    icon: inferred,
                  });
                  // 2. Debounce DB API call (1200ms after typing stops)
                  if (pendingTreeSaveTimeoutRef.current) {
                    clearTimeout(pendingTreeSaveTimeoutRef.current);
                  }
                  pendingTreeSaveTimeoutRef.current = setTimeout(() => {
                    onUpdateMeta(node.id, val.trim() || displayTitle, inferred);
                  }, 1200);
                }}


                onBlur={() => handleTitleSubmit()}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setEditTitle(displayTitle);
                    setIsEditing(false);
                  }
                }}
                autoFocus
                className="w-full bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 text-xs px-1.5 py-0.5 rounded border border-stone-300 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-zinc-400"
              />
            </form>
          ) : (
            <div className="truncate flex-1 flex items-center gap-1.5 min-w-0">
              <span className="truncate font-medium">
                {displayTitle || 'Untitled'}
              </span>
              {node.visibility === 'private' && (
                <span className="text-[10px] text-amber-600 shrink-0" title="Private to you">🔒</span>
              )}
              {(node.visibility === 'public' || node.visibility === 'public_edit') && (
                <span className="text-[10px] text-blue-600 shrink-0" title="Publicly shared">🌐</span>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Actions (Visible on hover) */}
        <div
          className={clsx(
            'flex items-center gap-0.5 shrink-0 transition-opacity',
            showMenu
              ? 'opacity-100'
              : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'
          )}
        >
          {/* Pin / Favorite Button */}
          {onTogglePin && (
            <button
              type="button"
              title={node.isPinned ? "Remove from Favorites" : "Add to Favorites"}
              className={clsx(
                "p-1 rounded transition-colors cursor-pointer active-press",
                node.isPinned
                  ? "text-amber-500 hover:text-amber-600"
                  : "text-stone-400 dark:text-zinc-500 hover:text-stone-800 dark:hover:text-zinc-200 hover:bg-stone-200/70 dark:hover:bg-zinc-800/70"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(node.id);
              }}
            >
              <Star className={clsx("w-3.5 h-3.5", node.isPinned ? "fill-amber-400 text-amber-500" : "")} />
            </button>
          )}

          {/* Add Sub-Page (Only for editors) */}
          {canEdit && (
            <button
              type="button"
              title="Add sub-page"
              disabled={!!isProcessingAction}
              className="p-1 rounded text-stone-400 dark:text-zinc-500 hover:text-stone-800 dark:hover:text-zinc-200 hover:bg-stone-200/70 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer active-press disabled:opacity-50"
              onClick={handleCreateChild}
            >
              {isProcessingAction === 'creating' ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-stone-500 border-t-transparent animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5 text-stone-400 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-200" />
              )}
            </button>
          )}

          {/* Context Options or Active Action Spinner */}
          <div className="relative">
            {isProcessingAction && isProcessingAction !== 'creating' ? (
              <div className="p-1 flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-bg border-t-transparent animate-spin" />
              </div>
            ) : (
              <button
                type="button"
                title="More options"
                className="p-1 rounded text-stone-400 dark:text-zinc-500 hover:text-stone-800 dark:hover:text-zinc-200 hover:bg-stone-200/70 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer active-press"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
              >
                <HugeiconsIcon icon={MoreHorizontalIcon} size={14} />
              </button>
            )}

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 top-6 w-38 bg-white dark:bg-[#18181b] border border-stone-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 z-50 text-xs">
                  {onTogglePin && (
                    <button
                      type="button"
                      className="w-full text-left px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-zinc-800/70 flex items-center gap-2 text-stone-700 dark:text-zinc-300 font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onTogglePin(node.id);
                      }}
                    >
                      <Star className={clsx("w-3.5 h-3.5", node.isPinned ? "fill-amber-400 text-amber-500" : "text-stone-500 dark:text-zinc-400")} />
                      {node.isPinned ? 'Unpin Page' : 'Pin to Favorites'}
                    </button>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      className="w-full text-left px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-zinc-800/70 flex items-center gap-2 text-stone-700 dark:text-zinc-300 font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        setShowEmojiPicker(true);
                      }}
                    >
                      <span className="text-xs">✨</span>
                      Change Icon
                    </button>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      className="w-full text-left px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-zinc-800/70 flex items-center gap-2 text-stone-700 dark:text-zinc-300 font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        setIsEditing(true);
                      }}
                    >
                      <HugeiconsIcon icon={Edit02Icon} size={14} className="text-stone-500 dark:text-zinc-400" />
                      Rename
                    </button>
                  )}
                  {canEdit && onDuplicatePage && (
                    <button
                      type="button"
                      disabled={!!isProcessingAction}
                      className="w-full text-left px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-zinc-800/70 flex items-center gap-2 text-stone-700 dark:text-zinc-300 font-medium disabled:opacity-50"
                      onClick={handleDuplicate}
                    >
                      <Copy className="w-3.5 h-3.5 text-stone-500 dark:text-zinc-400" />
                      <span>{isProcessingAction === 'duplicating' ? 'Duplicating...' : 'Duplicate'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="w-full text-left px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-zinc-800/70 flex items-center gap-2 text-stone-700 dark:text-zinc-300 font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      exportPageToMarkdown(node);
                    }}
                  >
                    <HugeiconsIcon icon={Download01Icon} size={14} className="text-stone-500 dark:text-zinc-400" />
                    Export Page
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      disabled={!!isProcessingAction}
                      className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 text-rose-600 dark:text-rose-400 font-medium disabled:opacity-50"
                      onClick={handleDelete}
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={14} className="text-rose-500 dark:text-rose-400" />
                      <span>{isProcessingAction === 'deleting' ? 'Deleting...' : 'Delete'}</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Render Child Tree Nodes with Left Vertical Indentation Guide Line */}
      {isExpanded && hasChildren && (
        <div className="flex flex-col pl-3 border-l-2 border-stone-200 dark:border-zinc-800 ml-3 my-0.5 space-y-0.5">
          {node.children.map((child) => (
            <PageTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              onCreateChild={onCreateChild}
              onSelectPage={onSelectPage}
              onSoftDelete={onSoftDelete}
              onUpdateMeta={onUpdateMeta}
              onReorderPage={onReorderPage}
              onTogglePin={onTogglePin}
              onDuplicatePage={onDuplicatePage}
              draggedPageId={draggedPageId}
              setDraggedPageId={setDraggedPageId}
            />
          ))}
        </div>
      )}
    </div>
  );
};
