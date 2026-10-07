import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CollaboratorAvatars } from './CollaboratorAvatars';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download01Icon, Edit02Icon, TableIcon, File01Icon, Upload01Icon } from '@hugeicons/core-free-icons';
import {
  Star,
  Share2,
  MoreHorizontal,
  Undo,
  Redo,
  Copy,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Trash2,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '~/store/uiStore';
import type { DatabaseProperty } from '~/db/schema';
import { PropertyTypeIcon } from './database/PropertyTypeIcon';
import { DatabasePopover } from './database/DatabasePopover';

interface EditorHeaderProps {
  icon?: React.ReactNode;
  title: string;
  isDatabase?: boolean;
  activeUsers?: Array<any>;
  getClientId?: () => string;
  isReadOnly?: boolean;
  isPinned?: boolean;
  togglePinMutation?: any;
  duplicateMutation?: any;
  onDelete?: () => void;
  // Editable title and toolbar additions for database integration
  onTitleChange?: (newTitle: string) => void;
  onSaveTitle?: () => void;
  onRevertTitle?: () => void;
  onIconChange?: (newIcon: string | null) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  isSearching?: boolean;
  properties?: DatabaseProperty[];
  sortBy?: { propertyId: string; direction: 'asc' | 'desc' } | null;
  onSortChange?: (sortBy: { propertyId: string; direction: 'asc' | 'desc' } | null) => void;
  onAddItem?: () => void;
  onImportData?: () => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  icon,
  title,
  isDatabase = false,
  activeUsers = [],
  getClientId = () => 'default',
  isReadOnly = false,
  isPinned = false,
  togglePinMutation,
  duplicateMutation,
  onDelete,
  onTitleChange,
  onSaveTitle,
  onRevertTitle,
  searchQuery,
  onSearchChange,
  isSearching = false,
  properties = [],
  sortBy,
  onSortChange,
  onAddItem: _onAddItem,
  onImportData,
}) => {
  const {
    canUndo,
    canRedo,
    setShareModalOpen,
    setExportModalOpen,
    setRequestAccessOpen,
    showHeaderMenu,
    setShowHeaderMenu,
    setShowEmojiPicker,
  } = useUIStore();

  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);

  const activeSortProp = properties?.find((p) => p.id === sortBy?.propertyId);
  const activeSortName =
    sortBy?.propertyId === '__TITLE__'
      ? properties?.find((p) => p.type === 'title')?.name || 'Title'
      : activeSortProp?.name || 'Property';

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showHeaderMenu && moreButtonRef.current) {
      const rect = moreButtonRef.current.getBoundingClientRect();
      const dropdownWidth = 176;
      const dropdownHeight = 220;

      let top = rect.bottom + 4;
      let left = rect.right - dropdownWidth;

      if (rect.bottom + dropdownHeight > window.innerHeight - 12 && rect.top - dropdownHeight > 12) {
        top = rect.top - dropdownHeight - 4;
      }
      if (left < 10) left = 10;
      if (left + dropdownWidth > window.innerWidth - 10) left = window.innerWidth - dropdownWidth - 10;

      setMenuCoords({ top, left });
      setShowHeaderMenu(true);
    } else {
      setShowHeaderMenu(false);
    }
  };

  const handleTriggerUndo = () => {
    window.dispatchEvent(new CustomEvent('editor-undo'));
  };

  const handleTriggerRedo = () => {
    window.dispatchEvent(new CustomEvent('editor-redo'));
  };

  const isDuplicating = Boolean(duplicateMutation?.isPending);

  return (
    <header className="h-12 border-b border-stone-200/70 dark:border-zinc-800 px-4 flex items-center justify-between gap-4 bg-white/80 dark:bg-[#18181b]/80 backdrop-blur-xs shrink-0 select-none">
      {/* Left: Breadcrumb Trail & Editable Title */}
      <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-zinc-400 overflow-hidden min-w-0">
        <span className="hover:text-stone-800 dark:hover:text-zinc-200 cursor-pointer transition-colors flex items-center gap-1 shrink-0">
          {icon ? (
            <span>{icon}</span>
          ) : isDatabase ? (
            <HugeiconsIcon icon={TableIcon} size={14} className="text-stone-400 dark:text-zinc-500 shrink-0" />
          ) : (
            <HugeiconsIcon icon={File01Icon} size={14} className="text-stone-400 dark:text-zinc-500 shrink-0" />
          )}
          <span className="hidden sm:inline font-normal">{isDatabase ? 'Database' : 'Document'}</span>
        </span>
        <span className="shrink-0">/</span>

        {!isReadOnly && onSaveTitle ? (
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange?.(e.target.value)}
            onBlur={onSaveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              } else if (e.key === 'Escape') {
                onRevertTitle?.();
                e.currentTarget.blur();
              }
            }}
            className="font-semibold text-stone-900 dark:text-zinc-100 truncate max-w-40 sm:max-w-75 bg-transparent border-none focus:outline-none focus:bg-stone-100 dark:focus:bg-zinc-800 px-1 py-0.5 rounded transition-colors text-xs"
            placeholder={isDatabase ? "Untitled Database" : "Untitled Document"}
          />
        ) : (
          <span className="font-semibold text-stone-900 dark:text-zinc-100 truncate max-w-40 sm:max-w-75">
            {title || (isDatabase ? 'Untitled Database' : 'Untitled Document')}
          </span>
        )}
      </div>

      {/* Right: Actions, Search/New & Collaborators */}
      <div className="flex items-center gap-2.5 shrink-0">
        {onSearchChange !== undefined && (
          <div className="flex items-center gap-1.5 mr-1">
            <div className="relative">
              {isSearching ? (
                <div className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                  <div className="w-3 h-3 rounded-full border border-stone-400 dark:border-zinc-500 border-t-transparent animate-spin" />
                </div>
              ) : (
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500 pointer-events-none" />
              )}
              <input
                type="text"
                placeholder="Search (min 3 chars)..."
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-7 pr-2.5 py-1 text-xs rounded-md border border-stone-200/80 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-900/50 text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#1f4d3d] w-32 sm:w-48 transition-all"
              />
            </div>

            {/* DB Sort Popover Toggle */}
            {onSortChange !== undefined && (
              <div className="relative">
                <button
                  ref={sortButtonRef}
                  type="button"
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className={clsx(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors cursor-pointer font-medium select-none",
                    sortBy
                      ? "bg-stone-100 dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 border border-stone-200 dark:border-zinc-700"
                      : "text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800 border border-transparent"
                  )}
                  title={sortBy ? `Sorted by ${activeSortName} (${sortBy.direction})` : "Sort database"}
                >
                  {sortBy ? (
                    sortBy.direction === 'asc' ? (
                      <ArrowUp className="w-3.5 h-3.5 text-[#1f4d3d] dark:text-emerald-400 shrink-0" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-[#1f4d3d] dark:text-emerald-400 shrink-0" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-stone-400 dark:text-zinc-500 shrink-0" />
                  )}
                  <span className="truncate max-w-24 sm:max-w-32">{sortBy ? activeSortName : 'Sort'}</span>
                  {sortBy && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onSortChange(null);
                      }}
                      className="p-0.5 rounded hover:bg-stone-200 dark:hover:bg-zinc-700 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                      title="Clear sort"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  )}
                </button>

                <DatabasePopover
                  isOpen={showSortMenu}
                  onClose={() => setShowSortMenu(false)}
                  triggerRef={sortButtonRef}
                  align="right"
                  width={200}
                >
                  <div className="py-1 min-w-[190px] text-left">
                    <div className="px-3 py-1 flex items-center justify-between border-b border-stone-100 dark:border-zinc-700/60 pb-1 mb-1">
                      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                        Sort by
                      </span>
                      {sortBy && (
                        <button
                          type="button"
                          onClick={() => {
                            onSortChange(null);
                            setShowSortMenu(false);
                          }}
                          className="text-[10px] text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-0.5 px-1">
                      {/* Title Property */}
                      {(() => {
                        const titleProp = properties?.find((p) => p.type === 'title');
                        const isTitleSorted = sortBy?.propertyId === '__TITLE__' || (titleProp && sortBy?.propertyId === titleProp.id);
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              if (isTitleSorted) {
                                onSortChange({
                                  propertyId: '__TITLE__',
                                  direction: sortBy?.direction === 'asc' ? 'desc' : 'asc',
                                });
                              } else {
                                onSortChange({ propertyId: '__TITLE__', direction: 'asc' });
                              }
                            }}
                            className={clsx(
                              "w-full px-2.5 py-1.5 text-xs rounded-md flex items-center justify-between gap-2 transition-all cursor-pointer text-left",
                              isTitleSorted
                                ? "bg-stone-100 dark:bg-zinc-800 font-medium text-stone-900 dark:text-zinc-100"
                                : "text-stone-700 dark:text-zinc-300 hover:bg-stone-100/70 dark:hover:bg-zinc-800/60"
                            )}
                          >
                            <div className="flex items-center gap-2 truncate min-w-0">
                              <PropertyTypeIcon type="title" icon={titleProp?.icon} className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                              <span className="truncate">{titleProp?.name || 'Title'}</span>
                            </div>
                            {isTitleSorted && (
                              <div className="flex items-center gap-1 shrink-0 text-[#1f4d3d] dark:text-emerald-400">
                                {sortBy.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                              </div>
                            )}
                          </button>
                        );
                      })()}

                      {/* Custom Database Properties */}
                      {properties?.filter((p) => p.type !== 'title').map((prop) => {
                        const isPropSorted = sortBy?.propertyId === prop.id;
                        return (
                          <button
                            key={prop.id}
                            type="button"
                            onClick={() => {
                              if (isPropSorted) {
                                onSortChange({
                                  propertyId: prop.id,
                                  direction: sortBy?.direction === 'asc' ? 'desc' : 'asc',
                                });
                              } else {
                                onSortChange({ propertyId: prop.id, direction: 'asc' });
                              }
                            }}
                            className={clsx(
                              "w-full px-2.5 py-1.5 text-xs rounded-md flex items-center justify-between gap-2 transition-all cursor-pointer text-left",
                              isPropSorted
                                ? "bg-stone-100 dark:bg-zinc-800 font-medium text-stone-900 dark:text-zinc-100"
                                : "text-stone-700 dark:text-zinc-300 hover:bg-stone-100/70 dark:hover:bg-zinc-800/60"
                            )}
                          >
                            <div className="flex items-center gap-2 truncate min-w-0">
                              <PropertyTypeIcon type={prop.type} icon={prop.icon} className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                              <span className="truncate">{prop.name}</span>
                            </div>
                            {isPropSorted && (
                              <div className="flex items-center gap-1 shrink-0 text-[#1f4d3d] dark:text-emerald-400">
                                {sortBy.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Remove sort */}
                    {sortBy && (
                      <div className="mt-1 pt-1 border-t border-stone-100 dark:border-zinc-700/60 px-1">
                        <button
                          type="button"
                          onClick={() => {
                            onSortChange(null);
                            setShowSortMenu(false);
                          }}
                          className="w-full px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded flex items-center gap-2 transition-colors cursor-pointer text-left"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Sort</span>
                        </button>
                      </div>
                    )}
                  </div>
                </DatabasePopover>
              </div>
            )}
          </div>
        )}
        <CollaboratorAvatars
          activeUsers={activeUsers}
          currentClientId={getClientId()}
          onOpenShare={() => setShareModalOpen(true)}
        />

        <div className="h-4 w-px bg-stone-200 dark:bg-zinc-800" />

        <div className="flex items-center gap-1">
          {!isReadOnly && (
            <>
              {/* Undo Button */}
              <button
                type="button"
                onClick={handleTriggerUndo}
                disabled={!canUndo}
                aria-label="Undo (Cmd+Z)"
                className={`p-1.5 rounded-md transition-colors ${canUndo
                  ? 'hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-700 dark:text-zinc-300 cursor-pointer'
                  : 'text-stone-300 dark:text-zinc-700 cursor-not-allowed opacity-40'
                  }`}
              >
                <Undo className="w-3.5 h-3.5" />
              </button>

              {/* Redo Button */}
              <button
                type="button"
                onClick={handleTriggerRedo}
                disabled={!canRedo}
                aria-label="Redo (Cmd+Shift+Z)"
                className={`p-1.5 rounded-md transition-colors ${canRedo
                  ? 'hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-700 dark:text-zinc-300 cursor-pointer'
                  : 'text-stone-300 dark:text-zinc-700 cursor-not-allowed opacity-40'
                  }`}
              >
                <Redo className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-stone-200 dark:bg-zinc-800 mr-2" />
            </>
          )}

          {/* Favorite Quick Button */}
          {togglePinMutation && (
            <button
              type="button"
              onClick={() => togglePinMutation?.mutate?.()}
              title={isPinned ? 'Remove from Favorites' : 'Add to Favorites'}
              className={clsx(
                'p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer active-press',
                isPinned ? 'text-amber-500 hover:text-amber-600' : 'text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200'
              )}
            >
              <Star
                className={clsx(
                  'w-3.5 h-3.5 transition-transform',
                  isPinned && 'fill-amber-400 text-amber-500',
                  togglePinMutation?.isPending && 'animate-spin'
                )}
              />
            </button>
          )}

          {/* Share or Request Edit Access Button */}
          {isReadOnly ? (
            <button
              type="button"
              onClick={() => setRequestAccessOpen(true)}
              className="px-2.5 py-1 rounded-md bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-100 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <HugeiconsIcon icon={Edit02Icon} size={12} />
              <span>Request Edit</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="px-2.5 py-1 rounded-md bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer active-press"
            >
              <Share2 className="w-3 h-3" />
              <span>Share</span>
            </button>
          )}

          {/* Kebab More Options Dropdown */}
          <div className="relative">
            <button
              ref={moreButtonRef}
              type="button"
              onClick={handleToggleMenu}
              className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              title="More options"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {showHeaderMenu && menuCoords && typeof document !== 'undefined' && createPortal(
              <>
                <div
                  className="fixed inset-0 z-50 bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHeaderMenu(false);
                  }}
                />
                <div
                  style={{ top: `${menuCoords.top}px`, left: `${menuCoords.left}px` }}
                  className="fixed w-44 bg-white dark:bg-[#18181b] border border-stone-200 dark:border-zinc-800 rounded-xl shadow-xl py-1.5 z-50 text-xs flex flex-col animate-in fade-in-50 duration-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Export Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowHeaderMenu(false);
                      setExportModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-zinc-800/70 flex items-center gap-2 text-stone-700 dark:text-zinc-300 font-medium cursor-pointer"
                  >
                    <HugeiconsIcon icon={Download01Icon} size={14} className="text-stone-500 dark:text-zinc-400" />
                    <span>{isDatabase ? 'Export Database' : 'Export Document'}</span>
                  </button>

                  {/* Import Data Option (for Databases) */}
                  {onImportData && !isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowHeaderMenu(false);
                        onImportData();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-zinc-800/70 flex items-center gap-2 text-stone-700 dark:text-zinc-300 font-medium cursor-pointer"
                    >
                      <HugeiconsIcon icon={Upload01Icon} size={14} className="text-stone-500 dark:text-zinc-400" />
                      <span>Import Data</span>
                    </button>
                  )}

                  {/* Bookmark / Favorite Option */}
                  {togglePinMutation && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowHeaderMenu(false);
                        togglePinMutation?.mutate?.();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-zinc-800/70 flex items-center gap-2 text-stone-700 dark:text-zinc-300 font-medium cursor-pointer"
                    >
                      <Star
                        className={clsx(
                          'w-3.5 h-3.5',
                          isPinned ? 'fill-amber-400 text-amber-500' : 'text-stone-500 dark:text-zinc-400',
                          togglePinMutation?.isPending && 'animate-spin'
                        )}
                      />
                      <span>
                        {togglePinMutation?.isPending
                          ? isPinned
                            ? 'Removing...'
                            : 'Adding...'
                          : isPinned
                            ? 'Remove Favorite'
                            : 'Add to Favorites'}
                      </span>
                    </button>
                  )}

                  {/* Duplicate Option */}
                  {duplicateMutation && !isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowHeaderMenu(false);
                        duplicateMutation?.mutate?.();
                      }}
                      disabled={isDuplicating}
                      className="w-full text-left px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-zinc-800/70 flex items-center gap-2 text-stone-700 dark:text-zinc-300 font-medium cursor-pointer disabled:opacity-50"
                    >
                      {isDuplicating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-500 dark:text-zinc-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-stone-500 dark:text-zinc-400" />
                      )}
                      <span>{isDuplicating ? 'Duplicating...' : 'Duplicate Page'}</span>
                    </button>
                  )}

                  {/* Change Icon Option */}
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowHeaderMenu(false);
                        setShowEmojiPicker(true);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-zinc-800/70 flex items-center gap-2 text-stone-700 dark:text-zinc-300 font-medium cursor-pointer"
                    >
                      <span className="text-xs">✨</span>
                      <span>Change Icon</span>
                    </button>
                  )}

                  {/* Delete Option */}
                  {onDelete && !isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowHeaderMenu(false);
                        onDelete();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 text-rose-600 dark:text-rose-400 font-medium cursor-pointer border-t border-stone-100 dark:border-zinc-800/80 mt-1 pt-1.5"
                    >
                      <span>Delete Page</span>
                    </button>
                  )}
                </div>
              </>,
              document.body
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
