import React, { useState, useEffect } from 'react';
import type { Page } from '~/db/schema';
import { useUIStore } from '~/store/uiStore';
import {
  Check,
  Loader2,
  PanelLeftOpen,
  MessageSquare,
  X,
} from 'lucide-react';
import { updatePageMeta } from '~/server/pages';
import { BlockEditorInner } from './BlockEditorInner';

interface EditorProps {
  page: Page;
  parentPath?: { id: string; title: string; icon?: string | null }[];
  onTitleOrIconChange?: (title: string, icon: string | null) => void;
  onBack?: () => void;
}

const EMOJI_OPTIONS = ['📄', '🚀', '📌', '📝', '💡', '🔥', '✨', '🎯', '📚', '⚙️', '🧪', '🎨', '🌟', '📦', '💻', '🧠', '⚡'];

export const Editor: React.FC<EditorProps> = ({
  page,
  parentPath = [],
  onTitleOrIconChange,
  onBack,
}) => {
  const { sidebarOpen, toggleSidebar, saveStatus, setSaveStatus } = useUIStore();
  const [title, setTitle] = useState(page.title);
  const [icon, setIcon] = useState(page.icon || '📄');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setTitle(page.title);
    setIcon(page.icon || '📄');
  }, [page.id, page.title, page.icon]);

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
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}

          {/* Active Tab Badge */}
          <div className="flex items-center gap-2 px-3 py-1 bg-neutral-50 border border-neutral-200/90 rounded-lg text-xs font-medium text-neutral-800 shadow-2xs">
            <span className="shrink-0">{icon}</span>
            <span className="truncate max-w-[200px]">
              {title || 'Untitled'}
            </span>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded hover:bg-neutral-200/60 transition-colors cursor-pointer"
                title="Close document"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Right Header Actions: Autosave status & Comments */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1.5 text-neutral-500 font-medium">
                <Loader2 className="w-3 h-3 animate-spin text-neutral-600" />
                Saving...
              </span>
            ) : saveStatus === 'saved' ? (
              <span className="flex items-center gap-1 text-neutral-500 font-medium">
                <Check className="w-3 h-3 text-emerald-600" />
                Saved
              </span>
            ) : null}
          </div>

          <button
            type="button"
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
            title="Comments & Discussion"
          >
            <MessageSquare className="w-4 h-4 stroke-[1.8]" />
          </button>
        </div>
      </header>

      {/* Notion-style Block Editor Canvas */}
      <div className="flex-1 overflow-y-auto px-6 py-8 md:px-16 lg:px-24 bg-white">
        <div className="max-w-3xl mx-auto flex flex-col">
          {/* Page Icon Picker */}
          <div className="relative mb-3 group">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-4xl p-1.5 rounded-xl hover:bg-neutral-100 transition-colors border border-transparent hover:border-neutral-200 flex items-center justify-center w-14 h-14 cursor-pointer"
              title="Change page icon"
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
            placeholder="Untitled"
            className="w-full bg-transparent text-3xl sm:text-4xl font-bold text-neutral-900 placeholder-neutral-300 focus:outline-none mb-6 border-b border-transparent focus:border-neutral-200 pb-1"
          />

          {/* BlockNote Document Canvas */}
          {mounted ? (
            <BlockEditorInner page={page} />
          ) : (
            <div className="min-h-[420px] flex items-center justify-center text-xs text-neutral-400">
              Loading block editor...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
