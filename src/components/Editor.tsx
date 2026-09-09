import React, { useState, useEffect } from 'react';
import type { Page } from '~/db/schema';
import { useUIStore } from '~/store/uiStore';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  SidebarLeftIcon,
  Comment01Icon,
  PlusSignIcon,
  File01Icon,
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  Loading02Icon,
} from '@hugeicons/core-free-icons';
import { updatePageMeta, getChildPages, createPage } from '~/server/pages';
import { BlockEditorInner } from './BlockEditorInner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

interface EditorProps {
  page: Page;
  parentPath?: { id: string; title: string; icon?: string | null }[];
  onTitleOrIconChange?: (title: string, icon: string | null) => void;
  onBack?: () => void;
}

const EMOJI_OPTIONS = ['📁', '📂', '📄', '🚀', '📌', '📝', '💡', '🔥', '✨', '🎯', '📚', '⚙️', '🧪', '🎨', '🌟', '📦', '💻', '🧠', '⚡'];

export const Editor: React.FC<EditorProps> = ({
  page,
  parentPath = [],
  onTitleOrIconChange,
  onBack,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { sidebarOpen, toggleSidebar, saveStatus, setSaveStatus, setActivePageId } = useUIStore();
  const [title, setTitle] = useState(page.title);
  const [icon, setIcon] = useState(page.icon || '📄');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isFolder = icon === '📁' || icon === '📂';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setTitle(page.title);
    setIcon(page.icon || '📄');
  }, [page.title, page.icon]);

  // Query child pages if this page is a folder
  const { data: childPages = [], refetch: refetchChildren } = useQuery({
    queryKey: ['childPages', page.id],
    queryFn: async () => {
      if (!isFolder) return [];
      return await getChildPages({ data: page.id });
    },
    enabled: isFolder,
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
    <div className="flex-1 flex flex-col h-full bg-white text-neutral-900 overflow-hidden relative font-sans">
      {/* Top Header Strip */}
      <header className="h-12 border-b border-neutral-200/80 px-4 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {!sidebarOpen && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1 rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors mr-1 cursor-pointer"
              title="Open sidebar"
            >
              <HugeiconsIcon icon={SidebarLeftIcon} size={16} />
            </button>
          )}
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1.5 text-neutral-500 font-medium">
                <HugeiconsIcon icon={Loading02Icon} size={13} className="animate-spin text-neutral-600" />
                Saving...
              </span>
            ) : saveStatus === 'saved' ? (
              <span className="flex items-center gap-1 text-neutral-500 font-medium">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} className="text-emerald-600" />
                Saved
              </span>
            ) : null}
          </div>

          <button
            type="button"
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
            title="Comments & Discussion"
          >
            <HugeiconsIcon icon={Comment01Icon} size={16} />
          </button>
        </div>
      </header>

      {/* Main Canvas */}
      <div className="flex-1 overflow-y-auto px-6 py-8 md:px-16 lg:px-24 bg-white">
        <div className="max-w-3xl mx-auto flex flex-col">
          {/* Page/Folder Icon Picker */}
          <div className="relative mb-3 group">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-4xl p-1.5 rounded-xl hover:bg-neutral-100 transition-colors border border-transparent hover:border-neutral-200 flex items-center justify-center w-14 h-14 cursor-pointer"
              title="Change icon"
            >
              {icon}
            </button>

            {showEmojiPicker && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowEmojiPicker(false)} />
                <div className="absolute left-0 top-16 z-40 p-2.5 bg-white border border-neutral-200 rounded-xl shadow-xl flex flex-wrap gap-1.5 w-64">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => handleSelectIcon(e)}
                      className="text-2xl p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
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
            placeholder={isFolder ? 'Folder Name' : 'Untitled'}
            className="w-full bg-transparent text-3xl sm:text-4xl font-bold text-neutral-900 placeholder-neutral-300 focus:outline-none mb-4 border-b border-transparent focus:border-neutral-200 pb-1"
          />

          {isFolder ? (
            /* FOLDER VIEW: Read-only list of documents inside (No text editing inside folders) */
            <div className="flex flex-col gap-6 mt-2">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Documents in this Folder ({childPages.length})
                </span>
                <button
                  type="button"
                  onClick={() => createDocumentInFolderMutation.mutate()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black hover:bg-neutral-800 text-white text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={14} />
                  <span>New Document</span>
                </button>
              </div>

              {childPages.length === 0 ? (
                <div className="py-12 border border-dashed border-neutral-200 rounded-xl flex flex-col items-center justify-center text-center p-6 gap-2.5 text-neutral-400">
                  <HugeiconsIcon icon={File01Icon} size={32} className="stroke-1 text-neutral-300" />
                  <span className="text-xs font-medium text-neutral-500">This folder is empty</span>
                  <span className="text-[11px]">Click "+ New Document" above to add a document to this folder.</span>
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
                      className="p-3.5 rounded-xl border border-neutral-200/80 hover:border-neutral-300 bg-white hover:bg-neutral-50/80 transition-all flex items-center justify-between cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg shrink-0">{child.icon || '📄'}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-neutral-900 group-hover:text-black truncate">
                            {child.title || 'Untitled Page'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <HugeiconsIcon icon={ArrowRight01Icon} size={15} className="text-neutral-400 group-hover:text-neutral-700 transition-colors" />
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
    </div>
  );
};
