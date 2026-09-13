import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { updatePageMeta } from '~/server/pages';
import { updateClientPageMeta } from '~/lib/pageMetaSync';
import { BlockEditorInner } from '~/components/BlockEditorInner';
import type { Page } from '~/db/schema';

interface SharedEditablePageProps {
  page: Page;
}

export function SharedEditablePage({ page }: SharedEditablePageProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(page.title);
  const [icon] = useState(page.icon || '📄');
  const [mounted, setMounted] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setTitle(page.title);
  }, [page.title]);

  const flushSave = async (t: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (t !== page.title) {
      await updatePageMeta({
        data: { pageId: page.id, title: t, icon },
      });
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    document.title = `${newTitle || 'Untitled Document'} - Notling`;
    updateClientPageMeta(queryClient, {
      pageId: page.id,
      title: newTitle,
      icon,
    });
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      flushSave(newTitle);
    }, 500);
  };

  const handleTitleBlur = () => {
    flushSave(title);
  };

  return (
    <div className="w-full flex flex-col">
      {/* Icon */}
      <div className="text-4xl mb-3">{icon}</div>

      {/* Title Input */}
      <input
        type="text"
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        onBlur={handleTitleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        placeholder="Untitled Document"
        className="w-full bg-transparent text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 placeholder-stone-300 focus:outline-none mb-4 border-b border-transparent focus:border-stone-200/80 pb-1.5 transition-colors"
      />

      {/* Interactive Block Editor */}
      {mounted ? (
        <BlockEditorInner key={`${page.id}-editable`} page={{ ...page, title, icon }} />
      ) : (
        <div className="min-h-[300px] flex flex-col items-center justify-center gap-2 text-xs text-neutral-400 dark:text-zinc-500">
          <div className="w-4 h-4 rounded-full border-2 border-stone-600 dark:border-zinc-400 border-t-transparent animate-spin" />
          <span>Loading editor...</span>
        </div>
      )}
    </div>
  );
}
