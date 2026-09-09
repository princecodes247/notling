import React, { useState, useEffect } from 'react';
import type { Page } from '~/db/schema';
import { useUIStore } from '~/store/uiStore';
import {
  Check,
  Loader2,
  PanelLeftOpen,
  ArrowLeft,
  MessageSquare,
  X,
  LayoutGrid,
  FileText,
} from 'lucide-react';
import { updatePageMeta } from '~/server/pages';
import { TimelineView } from './TimelineView';
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
  const [viewMode, setViewMode] = useState<'timeline' | 'document'>('timeline');
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
    <div className="flex-1 flex flex-col h-full bg-white text-neutral-900 overflow-hidden relative">
      {/* 1. Top Tab Strip (useDance 1:1) */}
      <header className="h-12 border-b border-neutral-200/80 px-4 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {!sidebarOpen && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1 rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors mr-1"
              title="Open sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}

          {/* Tab Pill [Agentic Development...  ✕] */}
          <div className="flex items-center gap-2 px-3 py-1 bg-white border border-neutral-200/90 rounded-lg text-xs font-medium text-neutral-800 shadow-2xs">
            <span className="truncate max-w-[160px]">
              {title || 'Agentic Development...'}
            </span>
            <button
              type="button"
              onClick={() => onBack?.()}
              className="text-neutral-400 hover:text-neutral-700 p-0.5"
              title="Close tab"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right Header Actions: View switcher & Message Bubble Icon */}
        <div className="flex items-center gap-3">
          {/* View Switcher: Timeline vs Document */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/60 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium ${
                viewMode === 'timeline'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('document')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium ${
                viewMode === 'document'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Notes</span>
            </button>
          </div>

          {/* Comment Bubble Icon (Image 1 top right) */}
          <button
            type="button"
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
            title="Comments & Discussion"
          >
            <MessageSquare className="w-4 h-4 stroke-[1.8]" />
          </button>
        </div>
      </header>

      {/* 2. Sub-Header Bar: Back Pill [← Agentic Development Workshop NYC] */}
      <div className="px-5 py-3 border-b border-neutral-100 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onBack?.()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-xs sm:text-sm font-medium text-neutral-800 shadow-2xs transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-neutral-500" />
            <span>{title || 'Agentic Development Workshop NYC'}</span>
          </button>
        </div>

        {/* Autosave badge */}
        <div className="flex items-center gap-2 text-xs">
          {saveStatus === 'saving' ? (
            <span className="flex items-center gap-1.5 text-neutral-500 font-medium">
              <Loader2 className="w-3 h-3 animate-spin text-neutral-600" />
              Saving...
            </span>
          ) : saveStatus === 'saved' ? (
            <span className="flex items-center gap-1 text-neutral-500 font-medium">
              <Check className="w-3 h-3 text-neutral-700" />
              Saved
            </span>
          ) : null}
        </div>
      </div>

      {/* 3. Main Body Canvas */}
      <div className="flex-1 overflow-hidden relative flex flex-col bg-white">
        {viewMode === 'timeline' ? (
          <TimelineView />
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-8 md:px-16 lg:px-24">
            <div className="max-w-3xl mx-auto flex flex-col">
              {/* Emoji Icon Picker */}
              <div className="relative mb-3 group">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-4xl p-1.5 rounded-xl hover:bg-neutral-100 transition-colors border border-transparent hover:border-neutral-200 flex items-center justify-center w-14 h-14"
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
                          className="text-2xl p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
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
                placeholder="Page Title"
                className="w-full bg-transparent text-3xl sm:text-4xl font-extrabold text-neutral-900 placeholder-neutral-400 focus:outline-none mb-6 border-b border-transparent focus:border-neutral-300 pb-1"
              />

              {/* BlockNote Document Canvas */}
              {mounted ? (
                <BlockEditorInner page={page} />
              ) : (
                <div className="min-h-[420px] flex items-center justify-center text-xs text-neutral-400">
                  Loading notes editor...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Footer Bar (1:1 with Image 1: [$10,000 / $40,000]) */}
      <footer className="h-11 border-t border-neutral-200/80 px-6 flex items-center justify-between bg-white shrink-0 text-xs font-semibold text-neutral-800">
        <div className="flex flex-col gap-1 w-44">
          <div className="w-16 h-0.5 bg-neutral-800 rounded-full" />
          <div className="text-[11px] tracking-tight">
            <span>$10,000</span>
            <span className="text-neutral-400 font-normal mx-1.5">/</span>
            <span>$40,000</span>
          </div>
        </div>

        <div className="text-[11px] text-neutral-400 font-normal">
          {viewMode === 'timeline' ? '7 tasks scheduled' : 'Autosynced to Postgres'}
        </div>
      </footer>
    </div>
  );
};
