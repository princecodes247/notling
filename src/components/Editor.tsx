import React, { useState, useEffect } from 'react';
import type { Page } from '~/db/schema';
import { useUIStore } from '~/store/uiStore';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  PlusSignIcon,
  File01Icon,
  ArrowRight01Icon,
  Loading02Icon,
  Share01Icon,
  Download01Icon,
} from '@hugeicons/core-free-icons';
import { updatePageMeta, getChildPages, createPage, updatePageVisibility, pingPagePresence, getActivePresence, removePagePresence } from '~/server/pages';
import { updateClientPageMeta } from '~/lib/pageMetaSync';
import { BlockEditorInner } from './BlockEditorInner';
import { CollaboratorAvatars } from './CollaboratorAvatars';
import { ShareModal } from './ShareModal';
import { ExportModal } from './ExportModal';
import { PublicBlockViewer } from '~/components/share/PublicBlockViewer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { getClientId } from '~/lib/collaboration';
import { EMOJI_OPTIONS } from '#/lib/constants';

interface EditorProps {
  page: Page & { canEdit?: boolean };
  onTitleOrIconChange?: (title: string, icon: string | null) => void;
  onBack?: () => void;
  readOnly?: boolean;
}

export const Editor: React.FC<EditorProps> = ({
  page,
  onTitleOrIconChange,
  readOnly: readOnlyProp,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { saveStatus, setSaveStatus, setActivePageId } = useUIStore();
  const [title, setTitle] = useState(page.title);
  const [icon, setIcon] = useState(page.icon || '📄');
  const [visibility, setVisibility] = useState<'private' | 'workspace' | 'public' | 'public_edit'>((page as any).visibility || 'workspace');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const titleInputRef = React.useRef<HTMLInputElement>(null);
  const pendingSaveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestMetaRef = React.useRef({ title, icon });
  latestMetaRef.current = { title, icon };

  const isReadOnly = readOnlyProp ?? (page.canEdit === false);
  const isFolder = icon === '📁' || icon === '📂';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (document.activeElement !== titleInputRef.current) {
      setTitle(page.title);
    }
    setIcon(page.icon || '📄');
    setVisibility((page as any).visibility || 'workspace');
  }, [page.id, page.title, page.icon, (page as any).visibility]);

  // Query active collaborators
  const { data: activeUsers = [] } = useQuery({
    queryKey: ['activePresence', page.id],
    queryFn: async () => await getActivePresence({ data: page.id }),
    refetchInterval: 1500,
  });

  // Heartbeat presence ping & immediate cleanup on unmount/leave
  useEffect(() => {
    const cid = getClientId();
    const role = isReadOnly ? 'viewer' : 'editor';
    const sendPing = async () => {
      if (typeof window !== 'undefined' && !navigator.onLine) return;
      try {
        await pingPagePresence({ data: { pageId: page.id, role, clientId: cid } });
      } catch { }
    };
    sendPing();
    const timer = setInterval(sendPing, 3000);

    const handleLeave = () => {
      if (typeof window !== 'undefined' && !navigator.onLine) return;
      try {
        removePagePresence({ data: { pageId: page.id, clientId: cid } });
      } catch { }
    };

    window.addEventListener('beforeunload', handleLeave);

    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', handleLeave);
      handleLeave();
    };
  }, [page.id, isReadOnly]);

  // Query child pages if this page is a folder
  const { data: childPages = [], refetch: refetchChildren } = useQuery({
    queryKey: ['childPages', page.id],
    queryFn: async () => {
      if (!isFolder) return [];
      return await getChildPages({ data: page.id });
    },
    enabled: isFolder,
  });

  const updateVisibilityMutation = useMutation({
    mutationFn: async (newVisibility: 'private' | 'workspace' | 'public' | 'public_edit') => {
      if (isReadOnly) return null;
      setVisibility(newVisibility);
      return await updatePageVisibility({ data: { pageId: page.id, visibility: newVisibility } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      queryClient.invalidateQueries({ queryKey: ['page', page.id] });
    },
  });

  const isCreatingInFolderRef = React.useRef(false);
  const createDocumentInFolderMutation = useMutation({
    mutationFn: async () => {
      if (isReadOnly || isCreatingInFolderRef.current) return null;
      isCreatingInFolderRef.current = true;
      try {
        return await createPage({
          data: {
            workspaceId: page.workspaceId,
            parentId: page.id,
            title: 'Untitled Document',
          },
        });
      } finally {
        isCreatingInFolderRef.current = false;
      }
    },
    onSuccess: (newPage) => {
      refetchChildren();
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      if (newPage) {
        setActivePageId(newPage.id);
        navigate({ to: '/dashboard/p/$pageId', params: { pageId: newPage.id } });
      }
    },
    onError: () => {
      isCreatingInFolderRef.current = false;
    },
  });

  const flushSaveMeta = React.useCallback(
    async (overrideTitle?: string, overrideIcon?: string) => {
      if (isReadOnly) return;
      if (pendingSaveTimeoutRef.current) {
        clearTimeout(pendingSaveTimeoutRef.current);
        pendingSaveTimeoutRef.current = null;
      }
      const t = overrideTitle !== undefined ? overrideTitle : latestMetaRef.current.title;
      const i = overrideIcon !== undefined ? overrideIcon : latestMetaRef.current.icon;

      if (t !== page.title || i !== (page.icon || '📄')) {
        setSaveStatus('saving');
        try {
          await updatePageMeta({
            data: { pageId: page.id, title: t, icon: i },
          });
          setSaveStatus('saved');
        } catch (err) {
          setSaveStatus('error');
        }
      }
    },
    [isReadOnly, page.id, page.title, page.icon, setSaveStatus]
  );

  // Flush pending save on unmount or page switch
  useEffect(() => {
    return () => {
      if (pendingSaveTimeoutRef.current) {
        clearTimeout(pendingSaveTimeoutRef.current);
        flushSaveMeta();
      }
    };
  }, [flushSaveMeta]);

  const handleTitleChange = (newTitle: string) => {
    if (isReadOnly) return;
    setTitle(newTitle);
    latestMetaRef.current.title = newTitle;

    // 1. Immediately reflect client-side everywhere BEFORE performing any API calls!
    updateClientPageMeta(queryClient, {
      pageId: page.id,
      title: newTitle,
      icon: latestMetaRef.current.icon,
    });
    onTitleOrIconChange?.(newTitle, latestMetaRef.current.icon);

    // 2. Schedule debounced server save
    setSaveStatus('saving');
    if (pendingSaveTimeoutRef.current) {
      clearTimeout(pendingSaveTimeoutRef.current);
    }
    pendingSaveTimeoutRef.current = setTimeout(() => {
      flushSaveMeta(newTitle, latestMetaRef.current.icon);
    }, 500);
  };

  const handleTitleBlur = () => {
    if (isReadOnly) return;
    flushSaveMeta();
  };

  const handleSelectIcon = async (selectedIcon: string) => {
    if (isReadOnly) return;
    setIcon(selectedIcon);
    latestMetaRef.current.icon = selectedIcon;
    setShowEmojiPicker(false);

    // 1. Immediately reflect client-side everywhere BEFORE performing any API calls!
    updateClientPageMeta(queryClient, {
      pageId: page.id,
      title: latestMetaRef.current.title,
      icon: selectedIcon,
    });
    onTitleOrIconChange?.(latestMetaRef.current.title, selectedIcon);

    // 2. Flush save to server
    flushSaveMeta(latestMetaRef.current.title, selectedIcon);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#18181b] text-stone-900 dark:text-stone-100 overflow-hidden relative -mt-4 sm:-mt-8">
      {/* Top Header Strip */}
      <header className="h-11 sm:h-12 border-b border-stone-200/70 dark:border-stone-800 px-3.5 sm:px-6 flex items-center justify-between bg-[#fdfcf9]/80 dark:bg-[#18181b]/80 backdrop-blur-xs shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0 mr-2">
          {/* Breadcrumb prefix: hidden on mobile, shown on desktop */}
          <span className="hidden sm:inline text-xs text-stone-400 dark:text-stone-500 font-medium shrink-0">
            {isFolder ? 'Folder' : 'Page'}
          </span>
          <span className="hidden sm:inline text-stone-300 dark:text-stone-700 text-xs shrink-0">/</span>

          {/* Document Title */}
          <span className="text-xs font-semibold sm:font-medium text-stone-900 dark:text-stone-100 sm:text-stone-700 dark:sm:text-stone-300 truncate max-w-[140px] sm:max-w-[260px]">
            {title || 'Untitled'}
          </span>

          {/* Visibility pill: hidden on mobile, shown on desktop */}
          <div className="hidden sm:flex items-center">
            {isReadOnly ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 flex items-center gap-1 shadow-2xs">
                <span>View only</span>
              </span>
            ) : (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium border flex items-center gap-1 ${visibility === 'public_edit'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60'
                  : visibility === 'public'
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60'
                    : visibility === 'workspace'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60'
                  }`}
              >
                {visibility === 'public_edit'
                  ? 'Anyone can edit'
                  : visibility === 'public'
                    ? 'Anyone with link'
                    : visibility === 'workspace'
                      ? 'Workspace'
                      : 'Private'}
              </span>
            )}
          </div>
        </div>

        {/* Right Header Actions: [saved dot] [collaborators if any] [Share] */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Quiet Save Status Indicator */}
          <div className="flex items-center text-xs shrink-0">
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1.5 text-stone-500 font-medium text-[11px]">
                <HugeiconsIcon icon={Loading02Icon} size={12} className="animate-spin text-stone-600" />
                <span className="hidden sm:inline">Saving...</span>
              </span>
            ) : saveStatus === 'saved' ? (
              <span className="flex items-center gap-1.5 text-stone-500 font-medium text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] shrink-0" />
                <span>Saved</span>
              </span>
            ) : saveStatus === 'offline' ? (
              <span className="flex items-center gap-1.5 text-amber-600 font-medium text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)] shrink-0" />
                <span>Saved Locally (Offline)</span>
              </span>
            ) : saveStatus === 'error' ? (
              <span className="flex items-center gap-1.5 text-red-500 font-medium text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)] shrink-0" />
                <span>Save Error</span>
              </span>
            ) : null}
          </div>

          {/* Collaborator Avatars (renders only other active collaborators, never self) */}
          <CollaboratorAvatars activeUsers={activeUsers} currentClientId={getClientId()} />

          {/* Export Button */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold tracking-tight transition-all cursor-pointer shrink-0 border border-stone-200/60 shadow-2xs active:scale-95"
            title="Export page to Markdown or PDF"
          >
            <HugeiconsIcon icon={Download01Icon} size={13} className="text-stone-600" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Share Button: full contrast black pill with room to breathe */}
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 active:scale-95 text-white text-xs font-semibold tracking-tight transition-all shadow-xs cursor-pointer shrink-0"
            >
              <HugeiconsIcon icon={Share01Icon} size={13} className="text-amber-200" />
              <span>Share</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Canvas */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 md:px-16 lg:px-24 pb-20 md:pb-12 bg-white dark:bg-[#18181b]">
        <div className="max-w-3xl mx-auto flex flex-col">
          {/* Page/Folder Icon Picker */}
          <div className="relative mb-3 group">
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => !isReadOnly && setShowEmojiPicker(!showEmojiPicker)}
              className={`text-4xl sm:text-5xl rounded-xl p-1 -ml-1 transition-transform ${isReadOnly ? 'cursor-default' : 'hover:bg-stone-100 dark:hover:bg-stone-800 hover:scale-105 cursor-pointer'
                }`}
            >
              {icon}
            </button>

            {showEmojiPicker && !isReadOnly && (
              <div className="absolute top-full left-0 mt-1 z-30 bg-white dark:bg-[#222226] border border-stone-200 dark:border-stone-700 rounded-xl shadow-xl p-3 grid grid-cols-6 gap-2 w-64 animate-in fade-in">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSelectIcon(emoji)}
                    className="text-2xl p-1.5 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors cursor-pointer text-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title Input */}
          {isReadOnly ? (
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100 mb-6">
              {title || 'Untitled Document'}
            </h1>
          ) : (
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Untitled Document"
              className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100 placeholder:text-stone-300 dark:placeholder:text-stone-700 bg-transparent focus:outline-none mb-6 border-none p-0"
            />
          )}

          {/* Folder Child Document List or BlockNote Editor */}
          {isFolder ? (
            <div className="mt-2 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Folder Contents
                </span>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => createDocumentInFolderMutation.mutate()}
                    className="flex items-center gap-1 text-xs font-medium text-stone-700 hover:text-stone-900 px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
                  >
                    <HugeiconsIcon icon={PlusSignIcon} size={13} />
                    <span>New Document</span>
                  </button>
                )}
              </div>

              {childPages.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center gap-2 text-stone-400">
                  <HugeiconsIcon icon={File01Icon} size={28} className="text-stone-300" />
                  <p className="text-xs font-medium">This folder is empty</p>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => createDocumentInFolderMutation.mutate()}
                      className="mt-1 text-xs text-stone-700 hover:underline font-semibold cursor-pointer"
                    >
                      Create a document inside
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {childPages.map((child: any) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => {
                        setActivePageId(child.id);
                        navigate({ to: '/dashboard/p/$pageId', params: { pageId: child.id } });
                      }}
                      className="p-3 rounded-xl border border-stone-200/80 hover:border-stone-400 hover:bg-stone-50/60 transition-all text-left flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg">{child.icon || '📄'}</span>
                        <span className="text-xs font-medium text-stone-800 truncate group-hover:text-stone-900">
                          {child.title || 'Untitled Document'}
                        </span>
                      </div>
                      <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="text-stone-300 group-hover:text-stone-600 shrink-0 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            mounted ? (
              isReadOnly ? (
                <PublicBlockViewer pageId={page.id} content={page.content} />
              ) : (
                <BlockEditorInner key={page.id} page={page} />
              )
            ) : (
              <div className="min-h-[420px] flex flex-col items-center justify-center gap-2.5 text-xs text-neutral-400 dark:text-zinc-500">
                <HugeiconsIcon icon={Loading02Icon} size={18} className="animate-spin text-stone-600 dark:text-zinc-400" />
                <span>Loading block editor...</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Google Docs-Style Share Modal */}
      {!isReadOnly && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          page={page}
          visibility={visibility}
          onUpdateVisibility={(newVis) => updateVisibilityMutation.mutate(newVis)}
        />
      )}

      {/* Export Modal (Markdown / PDF) */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        page={page}
      />
    </div>
  );
};
