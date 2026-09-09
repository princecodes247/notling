import React, { useState, useEffect, useRef } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import type { Page } from '~/db/schema';
import { useUIStore } from '~/store/uiStore';
import { updatePageContent } from '~/server/pages';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<boolean>(false);

  const initialContent = React.useMemo(() => {
    try {
      if (typeof page.content === 'string') return JSON.parse(page.content);
      if (Array.isArray(page.content) && page.content.length > 0) return page.content;
    } catch (e) {
      console.error('Failed to parse page content JSON', e);
    }
    return undefined;
  }, [page.id, page.content]);

  const editor = useCreateBlockNote({
    initialContent,
  });

  const editorRef = useRef(editor);
  const pageIdRef = useRef(page.id);

  useEffect(() => {
    editorRef.current = editor;
    pageIdRef.current = page.id;
  }, [editor, page.id]);

  const performSave = async () => {
    try {
      const currentBlocks = editorRef.current.document;
      const plainText = extractPlainTextFromBlocks(currentBlocks);

      await updatePageContent({
        data: {
          pageId: pageIdRef.current,
          content: currentBlocks,
          contentText: plainText,
        },
      });
      pendingSaveRef.current = false;
      setSaveStatus('saved');
      queryClient.invalidateQueries({ queryKey: ['page', pageIdRef.current] });
    } catch (err) {
      console.error('Autosave failed:', err);
      setSaveStatus('idle');
    }
  };

  const handleContentChange = () => {
    setSaveStatus('saving');
    pendingSaveRef.current = true;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, 500);
  };

  // Immediate save on unmount if pending changes exist
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (pendingSaveRef.current) {
        performSave();
      }
    };
  }, []);

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
