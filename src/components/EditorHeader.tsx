import React, { useEffect, useRef } from 'react';
import { CollaboratorAvatars } from './CollaboratorAvatars';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download01Icon, Edit02Icon } from '@hugeicons/core-free-icons';
import { Star, Share2, MoreHorizontal, Undo, Redo, Copy } from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '~/store/uiStore';

interface EditorHeaderProps {
  icon: React.ReactNode;
  title: string;
  isFolder?: boolean;
  activeUsers?: Array<any>;
  getClientId?: () => string;
  isReadOnly?: boolean;
  isPinned?: boolean;
  togglePinMutation?: any;
  duplicateMutation?: any;
  onDelete?: () => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  icon,
  title,
  isFolder = false,
  activeUsers = [],
  getClientId = () => 'default',
  isReadOnly = false,
  isPinned = false,
  togglePinMutation,
  duplicateMutation,
  onDelete,
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

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showHeaderMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowHeaderMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHeaderMenu, setShowHeaderMenu]);

  const handleTriggerUndo = () => {
    window.dispatchEvent(new CustomEvent('editor-undo'));
  };

  const handleTriggerRedo = () => {
    window.dispatchEvent(new CustomEvent('editor-redo'));
  };

  const isDuplicating = Boolean(duplicateMutation?.isPending);

  return (
    <header className="h-12 border-b border-stone-200/70 dark:border-zinc-800 px-4 flex items-center justify-between gap-4 bg-white/80 dark:bg-[#18181b]/80 backdrop-blur-xs shrink-0 select-none">
      {/* Left: Breadcrumb Trail */}
      <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-zinc-400 overflow-hidden">
        <span className="hover:text-stone-800 dark:hover:text-zinc-200 cursor-pointer transition-colors flex items-center gap-1">
          <span>{icon}</span>
          <span className="hidden sm:inline font-normal">{isFolder ? 'Folder' : 'Document'}</span>
        </span>
        <span>/</span>
        <span className="font-medium text-stone-900 dark:text-zinc-100 truncate max-w-40 sm:max-w-75">
          {title || 'Untitled Document'}
        </span>
      </div>

      {/* Right: Actions & Collaborator Avatars */}
      <div className="flex items-center gap-3 shrink-0">
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
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowHeaderMenu(!showHeaderMenu)}
              className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              title="More options"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {showHeaderMenu && (
              <div className="absolute right-0 top-8 w-44 bg-white dark:bg-[#18181b] border border-stone-200 dark:border-zinc-800 rounded-xl shadow-xl py-1.5 z-9999999 text-xs flex flex-col">
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
                  <span>Export Document</span>
                </button>

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
                    <Star className={clsx('w-3.5 h-3.5', isPinned ? 'fill-amber-400 text-amber-500' : 'text-stone-500 dark:text-zinc-400')} />
                    <span>{isPinned ? 'Remove Favorite' : 'Add to Favorites'}</span>
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
                    <Copy className="w-3.5 h-3.5 text-stone-500 dark:text-zinc-400" />
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
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
