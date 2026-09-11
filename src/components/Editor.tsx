import React, { useState, useEffect } from 'react';
import type { Page } from '~/db/schema';
import { useUIStore } from '~/store/uiStore';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Comment01Icon,
  PlusSignIcon,
  File01Icon,
  ArrowRight01Icon,
  Loading02Icon,
  Share01Icon,
} from '@hugeicons/core-free-icons';
import { updatePageMeta, getChildPages, createPage, updatePageVisibility } from '~/server/pages';
import { BlockEditorInner } from './BlockEditorInner';
import { ShareModal } from './ShareModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

interface EditorProps {
  page: Page;
  onTitleOrIconChange?: (title: string, icon: string | null) => void;
  onBack?: () => void;
}

const EMOJI_OPTIONS = ['📁', '📂', '📄', '🚀', '📌', '📝', '💡', '🔥', '✨', '🎯', '📚', '⚙️', '🧪', '🎨', '🌟', '📦', '💻', '🧠', '⚡'];

export const Editor: React.FC<EditorProps> = ({
  page,
  onTitleOrIconChange,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { saveStatus, setSaveStatus, setActivePageId } = useUIStore();
  const [title, setTitle] = useState(page.title);
  const [icon, setIcon] = useState(page.icon || '📄');
  const [visibility, setVisibility] = useState<'private' | 'workspace' | 'public'>((page as any).visibility || 'workspace');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isFolder = icon === '📁' || icon === '📂';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setTitle(page.title);
    setIcon(page.icon || '📄');
    setVisibility((page as any).visibility || 'workspace');
  }, [page.title, page.icon, (page as any).visibility]);

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
    mutationFn: async (newVisibility: 'private' | 'workspace' | 'public') => {
      setVisibility(newVisibility);
      return await updatePageVisibility({ data: { pageId: page.id, visibility: newVisibility } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      queryClient.invalidateQueries({ queryKey: ['page', page.id] });
    },
  });

  const createDocumentInFolderMutation = useMutation({
    mutationFn: async () => {
      return await createPage({
        data: {
          workspaceId: page.workspaceId,
          parentId: page.id,
          title: 'Untitled Document',
        },
      });
    },
    onSuccess: (newPage) => {
      refetchChildren();
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      if (newPage) {
        setActivePageId(newPage.id);
        navigate({ to: '/dashboard/p/$pageId', params: { pageId: newPage.id } });
      }
    },
  });

  const handleTitleBlur = async () => {
    if (title !== page.title) {
      setSaveStatus('saving');
      await updatePageMeta({
        data: { pageId: page.id, title, icon },
      });
      onTitleOrIconChange?.(title, icon);
      setSaveStatus('saved');
    }
  };

  const handleSelectIcon = async (selectedIcon: string) => {
    setIcon(selectedIcon);
    setShowEmojiPicker(false);
    setSaveStatus('saving');
    await updatePageMeta({
      data: { pageId: page.id, title, icon: selectedIcon },
    });
    onTitleOrIconChange?.(title, selectedIcon);
    setSaveStatus('saved');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white text-stone-900 overflow-hidden relative">
      {/* Top Header Strip */}
      <header className="h-12 border-b border-stone-200/70 px-6 flex items-center justify-between bg-[#fdfcf9]/80 backdrop-blur-xs shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-stone-400 font-medium truncate">
            {isFolder ? 'Folder' : 'Document'}
          </span>
          <span className="text-stone-300 text-xs">/</span>
          <span className="text-xs text-stone-700 font-medium truncate max-w-[200px]">
            {title || 'Untitled'}
          </span>

          {/* Visibility pill */}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border flex items-center gap-1 ${
            visibility === 'public'
              ? 'bg-blue-50 text-blue-700 border-blue-200/80'
              : visibility === 'workspace'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
              : 'bg-amber-50 text-amber-700 border-amber-200/80'
          }`}>
            {visibility === 'public' ? 'Public' : visibility === 'workspace' ? 'Workspace' : 'Private'}
          </span>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1.5 text-stone-500 font-medium text-[11px]">
                <HugeiconsIcon icon={Loading02Icon} size={12} className="animate-spin text-stone-600" />
                Saving...
              </span>
            ) : saveStatus === 'saved' ? (
              <span className="flex items-center gap-1.5 text-stone-500 font-medium text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                Saved
              </span>
            ) : null}
          </div>

          {/* Google Docs-Style Share Button */}
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold tracking-tight transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <HugeiconsIcon icon={Share01Icon} size={13} className="text-amber-200" />
            <span>Share</span>
          </button>

          <button
            type="button"
            className="p-1.5 rounded-md text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Comments & Discussion"
          >
            <HugeiconsIcon icon={Comment01Icon} size={15} />
          </button>
        </div>
      </header>

      {/* Main Canvas */}
      <div className="flex-1 overflow-y-auto px-6 py-10 md:px-16 lg:px-24 bg-white">
        <div className="max-w-3xl mx-auto flex flex-col">
          {/* Page/Folder Icon Picker */}
          <div className="relative mb-3 group">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-4xl p-1.5 rounded-lg hover:bg-neutral-100 transition-colors border border-transparent hover:border-neutral-200 flex items-center justify-center w-14 h-14 cursor-pointer"
              title="Change icon"
            >
              {icon}
            </button>

            {showEmojiPicker && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowEmojiPicker(false)} />
                <div className="absolute left-0 top-16 z-40 p-2.5 bg-white border border-neutral-200 rounded-lg shadow-xl flex flex-wrap gap-1.5 w-64">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => handleSelectIcon(e)}
                      className="text-2xl p-1.5 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder={isFolder ? 'Folder Name' : 'Untitled Document'}
            className="w-full bg-transparent text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 placeholder-stone-300 focus:outline-none mb-4 border-b border-transparent focus:border-stone-200/80 pb-1.5 transition-colors"
          />

          {isFolder ? (
            /* FOLDER VIEW: Read-only list of documents inside */
            <div className="flex flex-col gap-6 mt-2">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200/70">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Documents in this Folder ({childPages.length})
                </span>
                <button
                  type="button"
                  onClick={() => createDocumentInFolderMutation.mutate()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold tracking-tight transition-all shadow-xs cursor-pointer active:scale-98"
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={14} />
                  <span>New Document</span>
                </button>
              </div>

              {childPages.length === 0 ? (
                <div className="py-14 border border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center text-center p-6 gap-2.5 text-stone-400 bg-stone-50/40">
                  <HugeiconsIcon icon={File01Icon} size={32} className="stroke-1 text-stone-300" />
                  <span className="text-xs font-semibold text-stone-600">This folder is empty</span>
                  <span className="text-[11px] text-stone-400">Click "+ New Document" above to start writing inside this folder.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {childPages.map((child: { id: string; title: string; icon?: string | null; updatedAt?: Date }) => (
                    <div
                      key={child.id}
                      onClick={() => {
                        setActivePageId(child.id);
                        navigate({ to: '/dashboard/p/$pageId', params: { pageId: child.id } });
                      }}
                      className="p-3.5 rounded-lg border border-stone-200/80 hover:border-stone-300 bg-white hover:bg-stone-50/80 transition-all flex items-center justify-between cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg shrink-0">{child.icon || '📄'}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-stone-900 group-hover:text-black truncate">
                            {child.title || 'Untitled Document'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <HugeiconsIcon icon={ArrowRight01Icon} size={15} className="text-stone-400 group-hover:text-stone-700 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* DOCUMENT VIEW: Notion-style BlockNote Editor */
            mounted ? (
              <BlockEditorInner page={page} />
            ) : (
              <div className="min-h-[420px] flex items-center justify-center text-xs text-neutral-400">
                Loading block editor...
              </div>
            )
          )}
        </div>
      </div>

      {/* Google Docs-Style Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        page={page}
        visibility={visibility}
        onUpdateVisibility={(newVis) => updateVisibilityMutation.mutate(newVis)}
      />
    </div>
  );
};
