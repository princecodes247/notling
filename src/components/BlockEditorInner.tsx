import React, { useState, useEffect, useRef } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import type { Page } from '~/db/schema';
import { useUIStore } from '~/store/uiStore';
import { updatePageContent } from '~/server/pages';

interface BlockEditorInnerProps {
  page: Page;
}

function extractPlainTextFromBlocks(blocks: any[]): string {
  let text = '';
  if (!Array.isArray(blocks)) return '';
  for (const block of blocks) {
    if (block.content && Array.isArray(block.content)) {
      for (const item of block.content) {
        if (item.text) text += item.text + ' ';
      }
    }
    if (block.children && Array.isArray(block.children)) {
      text += extractPlainTextFromBlocks(block.children) + ' ';
    }
  }
  return text.trim();
}

export const BlockEditorInner: React.FC<BlockEditorInnerProps> = ({ page }) => {
  const { setSaveStatus } = useUIStore();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const initialContent = React.useMemo(() => {
    try {
      if (typeof page.content === 'string') return JSON.parse(page.content);
      if (Array.isArray(page.content) && page.content.length > 0) return page.content;
    } catch (e) {
      console.error('Failed to parse page content JSON', e);
    }
    return undefined;
  }, [page.id]);

  const editor = useCreateBlockNote({
    initialContent,
  });

  const handleContentChange = () => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const currentBlocks = editor.document;
        const plainText = extractPlainTextFromBlocks(currentBlocks);

        await updatePageContent({
          data: {
            pageId: page.id,
            content: currentBlocks,
            contentText: plainText,
          },
        });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Autosave failed:', err);
        setSaveStatus('idle');
      }
    }, 800);
  };

  return (
    <div className="min-h-[420px]">
      <BlockNoteView
        editor={editor}
        theme="light"
        onChange={handleContentChange}
      />
    </div>
  );
};
