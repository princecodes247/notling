import React, { useState, useEffect } from 'react';
import type { Page } from '~/db/schema';
import { useUIStore } from '~/store/uiStore';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  PlusSignIcon,
  Folder01Icon,
  LoaderCircleIcon,
  LockIcon,
  File01Icon,
} from '@hugeicons/core-free-icons';
import { Clock } from 'lucide-react';
import {
  updatePageMeta,
  getChildPages,
  createPage,
  updatePageVisibility,
  pingPagePresence,
  getActivePresence,
  removePagePresence,
  togglePinPage,
  duplicatePage,
} from '~/server/pages';
import { updateClientPageMeta } from '~/lib/pageMetaSync';
import { BlockEditorInner } from './BlockEditorInner';
import { ShareModal } from './ShareModal';
import { ExportModal } from './ExportModal';
import { RequestEditAccessModal } from './RequestEditAccessModal';
import { VersionHistoryDrawer } from './VersionHistoryDrawer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { getClientId } from '~/lib/collaboration';
import { EmojiPicker } from './EmojiPicker';
import { inferEmojiFromTitle, isDefaultOrInferredIcon } from '~/lib/emojiUtils';
import { EditorHeader } from './EditorHeader';

function formatRelativeTime(dateInput?: string | Date | null): string {
  if (!dateInput) return 'Just now';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

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
  const {
    saveStatus,
    setSaveStatus,
    setActivePageId,
    isShareModalOpen,
    setShareModalOpen,
    isExportModalOpen,
    setExportModalOpen,
    isHistoryDrawerOpen,
    setHistoryDrawerOpen,
    isRequestAccessOpen,
    setRequestAccessOpen,
    showEmojiPicker,
    setShowEmojiPicker,
    setHistoryState,
  } = useUIStore();
  const [title, setTitle] = useState(page.title);
  const [icon, setIcon] = useState(page.icon || undefined);
  const [isCustomIcon, setIsCustomIcon] = useState(() => !isDefaultOrInferredIcon(page.icon, page.title, { isFolder: page.icon === '📁' || page.icon === '📂' }));
  const [visibility, setVisibility] = useState<'private' | 'workspace' | 'public' | 'public_edit'>((page as any).visibility || 'workspace');
  const [isPinned, setIsPinned] = useState(!!(page as any).isPinned);
  const [, setMounted] = useState(false);

  useEffect(() => {
    setTitle(page.title);
    const initialIcon = page.icon || undefined;
    setIcon(initialIcon);
    setIsCustomIcon(!isDefaultOrInferredIcon(initialIcon, page.title, { isFolder: initialIcon === '📁' || initialIcon === '📂' }));
    setVisibility((page as any).visibility || 'workspace');
    setIsPinned(!!(page as any).isPinned);
  }, [page.id, page.title, page.icon, (page as any).visibility, (page as any).isPinned]);

  useEffect(() => {
    const handleHistoryState = (e: any) => {
      if (e.detail) {
        setHistoryState(!!e.detail.canUndo, !!e.detail.canRedo);
      }
    };
    window.addEventListener('editor-history-state', handleHistoryState);
    return () => window.removeEventListener('editor-history-state', handleHistoryState);
  }, [setHistoryState]);

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
    const currentIcon = page.icon || undefined;
    setIcon(currentIcon);
    setIsCustomIcon(!isDefaultOrInferredIcon(currentIcon, page.title, { isFolder: currentIcon === '📁' || currentIcon === '📂' }));
    setVisibility((page as any).visibility || 'workspace');
    setIsPinned(!!(page as any).isPinned);
  }, [page.id, page.title, page.icon, (page as any).visibility, (page as any).isPinned]);


  // Query active collaborators
  const { data: activeUsers = [] } = useQuery({
    queryKey: ['activePresence', page.id],
    queryFn: async () => await getActivePresence({ data: page.id }),
    refetchInterval: 10000,
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
    const timer = setInterval(sendPing, 15000);

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

  const togglePinMutation = useMutation({
    mutationFn: async () => {
      const nextPinned = !isPinned;
      setIsPinned(nextPinned);
      return await togglePinPage({ data: { pageId: page.id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      queryClient.invalidateQueries({ queryKey: ['page', page.id] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (isReadOnly) return null;
      return await duplicatePage({ data: page.id });
    },
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      if (newPage) {
        setActivePageId(newPage.id);
        navigate({ to: '/dashboard/p/$pageId', params: { pageId: newPage.id } });
      }
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

      if (t !== page.title || i !== (page.icon || null)) {
        updateClientPageMeta(queryClient, { pageId: page.id, title: t, icon: i });
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
    [isReadOnly, page.id, page.title, page.icon, queryClient, setSaveStatus]
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

    let targetIcon = latestMetaRef.current.icon;
    const isFolderCurrent = targetIcon === '📁' || targetIcon === '📂';
    if (!isCustomIcon || isDefaultOrInferredIcon(targetIcon, newTitle, { isFolder: isFolderCurrent })) {
      const inferred = inferEmojiFromTitle(newTitle, { isFolder: isFolderCurrent });
      if (inferred && inferred !== targetIcon) {
        targetIcon = inferred;
        setIcon(targetIcon);
        latestMetaRef.current.icon = targetIcon;
      }
    }

    updateClientPageMeta(queryClient, {
      pageId: page.id,
      title: newTitle,
      icon: targetIcon,
    });
    onTitleOrIconChange?.(newTitle, targetIcon || null);

    setSaveStatus('saving');
    if (pendingSaveTimeoutRef.current) {
      clearTimeout(pendingSaveTimeoutRef.current);
    }
    pendingSaveTimeoutRef.current = setTimeout(() => {
      flushSaveMeta(newTitle, targetIcon);
    }, 1200);

  };

  const handleTitleBlur = () => {
    if (isReadOnly) return;
    flushSaveMeta();
  };

  const handleSelectIcon = async (selectedIcon: string | undefined) => {
    if (isReadOnly) return;

    setIcon(selectedIcon);
    latestMetaRef.current.icon = selectedIcon;
    setIsCustomIcon(!isDefaultOrInferredIcon(selectedIcon, latestMetaRef.current.title, { isFolder: selectedIcon === '📁' || selectedIcon === '📂' }));
    setShowEmojiPicker(false);

    updateClientPageMeta(queryClient, {
      pageId: page.id,
      title: latestMetaRef.current.title,
      icon: selectedIcon || null,
    });
    onTitleOrIconChange?.(latestMetaRef.current.title, selectedIcon || null);

    flushSaveMeta(latestMetaRef.current.title, selectedIcon);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#18181b] text-stone-900 dark:text-stone-100 overflow-hidden relative">

      <EditorHeader
        icon={icon}
        title={title}
        isFolder={isFolder}
        activeUsers={activeUsers}
        getClientId={getClientId}
        isReadOnly={isReadOnly}
        isPinned={isPinned}
        togglePinMutation={togglePinMutation}
        duplicateMutation={duplicateMutation}
      />

      {/* Main Canvas */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 md:px-16 lg:px-24 pb-32 sm:pb-24 md:pb-12 bg-white dark:bg-[#18181b]">
        <div className="max-w-3xl mx-auto flex flex-col">
          {/* Page/Folder Icon */}
          <div className="relative mb-3 group">
            {isReadOnly ? (
              <span className="text-4xl sm:text-5xl rounded-xl p-1 -ml-1 inline-flex items-center justify-center select-none">
                {icon ? icon : <HugeiconsIcon icon={File01Icon} size={36} className="text-stone-400 dark:text-zinc-500" />}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-4xl sm:text-5xl rounded-xl p-1 -ml-1 transition-transform hover:bg-stone-100 dark:hover:bg-stone-800 hover:scale-105 cursor-pointer inline-flex items-center justify-center"
                title="Change icon"
              >
                {icon ? icon : <HugeiconsIcon icon={File01Icon} size={36} className="text-stone-400 dark:text-zinc-500" />}
              </button>
            )}

            {showEmojiPicker && !isReadOnly && (
              <EmojiPicker
                onSelect={(selectedEmoji) => handleSelectIcon(selectedEmoji)}
                onClose={() => setShowEmojiPicker(false)}
                currentEmoji={icon}
                onRemove={() => handleSelectIcon(undefined)}
                className="top-full left-0 mt-1"
              />
            )}
          </div>

          {/* 1 & 4. Document Header Metadata Row: Visibility Pill + Timestamp Display & Moved Saved Status */}
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap text-xs text-stone-400 dark:text-zinc-500">
            {/* Left: Visibility Pill */}
            <div className="flex items-center gap-2">
              {isReadOnly ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 flex items-center gap-1 shadow-2xs">
                  <HugeiconsIcon icon={LockIcon} size={11} />
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

            {/* Right: Timestamp display & Moved Saved status */}
            <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-zinc-500 font-normal">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-stone-400 dark:text-zinc-500" />
                <span>Updated {formatRelativeTime((page as any).updatedAt || (page as any).createdAt)}</span>
              </span>
              <span>&bull;</span>
              {saveStatus === 'saving' ? (
                <span className="flex items-center gap-1 text-stone-500 font-medium">
                  <HugeiconsIcon icon={LoaderCircleIcon} size={12} className="animate-spin text-stone-600" />
                  <span>Saving...</span>
                </span>
              ) : saveStatus === 'saved' ? (
                <span className="flex items-center gap-1 text-stone-500 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] shrink-0" />
                  <span>Saved</span>
                </span>
              ) : saveStatus === 'offline' ? (
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>Saved Locally</span>
                </span>
              ) : saveStatus === 'error' ? (
                <span className="flex items-center gap-1 text-red-500 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <span>Save Error</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-stone-500 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Saved</span>
                </span>
              )}
            </div>
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
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
                  Folder Contents
                </span>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => createDocumentInFolderMutation.mutate()}
                    className="flex items-center gap-1.5 text-xs font-medium text-stone-700 dark:text-zinc-300 hover:text-stone-900 dark:hover:text-white px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer active-press"
                  >
                    <HugeiconsIcon icon={PlusSignIcon} size={13} />
                    <span>New Document</span>
                  </button>
                )}
              </div>

              {childPages.length === 0 ? (
                <div className="py-14 px-6 border border-dashed border-stone-200/90 dark:border-zinc-800/90 rounded-2xl flex flex-col items-center justify-center text-center gap-3 text-stone-400 dark:text-zinc-500 bg-stone-50/40 dark:bg-zinc-900/40 shadow-2xs">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-zinc-800 text-stone-400 dark:text-zinc-400 flex items-center justify-center shadow-2xs">
                    <HugeiconsIcon icon={Folder01Icon} size={24} />
                  </div>
                  <div className="flex flex-col gap-1 max-w-xs">
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-zinc-100 tracking-tight">
                      This folder is empty
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-zinc-400 leading-relaxed">
                      Create your first document inside this folder to start organizing notes and pages.
                    </p>
                  </div>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => createDocumentInFolderMutation.mutate()}
                      className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-bg hover:bg-brand-hover text-brand-fg text-xs font-medium shadow-2xs transition-all cursor-pointer active-press"
                    >
                      <HugeiconsIcon icon={PlusSignIcon} size={14} />
                      <span>Create document</span>
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
                      className="p-3 rounded-xl border border-stone-200/80 dark:border-zinc-800/80 hover:border-stone-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900/60 hover:bg-stone-50/60 dark:hover:bg-zinc-800/60 transition-all text-left flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg">{child.icon || null}</span>
                        <span className="text-xs font-medium text-stone-800 dark:text-zinc-200 truncate group-hover:text-stone-900 dark:group-hover:text-white">
                          {child.title || 'Untitled Document'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <BlockEditorInner page={page} readOnly={isReadOnly} />
          )}
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setShareModalOpen(false)}
        page={page}
        visibility={visibility}
        onUpdateVisibility={(newVis) => updateVisibilityMutation.mutate(newVis)}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setExportModalOpen(false)}
        page={page}
      />

      {/* Version History Drawer */}
      <VersionHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        pageId={page.id}
        onVersionRestored={() => {
          queryClient.invalidateQueries({ queryKey: ['page', page.id] });
          queryClient.invalidateQueries({ queryKey: ['publicPage', page.id] });
        }}
      />

      {/* Request Edit Access Modal */}
      <RequestEditAccessModal
        isOpen={isRequestAccessOpen}
        onClose={() => setRequestAccessOpen(false)}
        pageId={page.id}
        pageTitle={page.title || 'Untitled Document'}
        isLoggedIn={true}
      />
    </div>
  );
};

export default Editor;
