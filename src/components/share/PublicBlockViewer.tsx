import { useMemo, useState, useEffect } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { getClientId, useCollaboration } from '~/lib/collaboration';

interface PublicBlockViewerProps {
  pageId: string;
  content: any;
  userEmail?: string | null;
}

export function PublicBlockViewer({ pageId, content, userEmail }: PublicBlockViewerProps) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark'
      : false
  );

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';
      setIsDark(dark);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => observer.disconnect();
  }, []);

  const parsedBlocks = useMemo(() => {
    try {
      if (typeof content === 'string') return JSON.parse(content);
      if (Array.isArray(content) && content.length > 0) return content;
    } catch (e) {
      console.error('Failed to parse page content', e);
    }
    return undefined;
  }, [content]);

  const cid = getClientId();
  const viewerName = userEmail ? (userEmail.includes('@') ? userEmail.split('@')[0] : userEmail) : `Guest ${cid.slice(-4)}`;
  const collab = useCollaboration(pageId, viewerName, userEmail || cid, true);

  const editorOptions = useMemo(() => {
    const opts: any = {
      initialContent: parsedBlocks && parsedBlocks.length > 0 ? parsedBlocks : undefined,
    };
    if (collab) {
      opts.collaboration = {
        provider: collab.provider,
        fragment: collab.fragment,
        user: collab.user,
        showCursorLabels: collab.showCursorLabels,
      };
    }
    return opts;
  }, [parsedBlocks, collab]);

  const editor = useCreateBlockNote(editorOptions, [pageId, collab?.doc, collab?.provider]);

  // Neutralize SideMenuPlugin.isDragOrigin on the viewer
  useEffect(() => {
    const patchSideMenuView = () => {
      const sideMenuView = (editor as any)?.sideMenu?.view;
      if (sideMenuView && !sideMenuView.__dragOriginPatched) {
        sideMenuView.__dragOriginPatched = true;
        Object.defineProperty(sideMenuView, 'isDragOrigin', {
          get: () => false,
          set: () => { },
          configurable: true,
        });
      }
    };
    patchSideMenuView();
    const timer = setTimeout(patchSideMenuView, 100);
    return () => clearTimeout(timer);
  }, [editor]);

  function isBlocksArrayEmpty(blocks: any[]): boolean {
    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return true;
    if (blocks.length === 1) {
      const first = blocks[0];
      const hasNoContent = !first.content || (Array.isArray(first.content) && first.content.length === 0);
      let hasNoText = true;
      if (typeof first.content === 'string') {
        hasNoText = !first.content.trim();
      } else if (Array.isArray(first.content)) {
        hasNoText = !first.content.some((item: any) => item?.text && item.text.trim().length > 0);
      } else if (first.text) {
        hasNoText = !first.text.trim();
      }
      const hasNoChildren = !first.children || (Array.isArray(first.children) && first.children.length === 0);
      if ((first.type === 'paragraph' || !first.type) && hasNoContent && hasNoText && hasNoChildren) {
        return true;
      }
    }
    return false;
  }

  // Seed or sync viewer blocks
  useEffect(() => {
    if (!editor || !parsedBlocks || isBlocksArrayEmpty(parsedBlocks)) return;

    const syncViewerBlocks = () => {
      const currentDoc = editor.document;
      if (isBlocksArrayEmpty(currentDoc)) {
        try {
          editor.replaceBlocks(currentDoc, parsedBlocks);
        } catch (err) {
          console.error('Failed to populate initial viewer blocks:', err);
        }
        return;
      }

      // If there are no other active WebRTC peers broadcasting live Yjs updates,
      // fallback to syncing with polled DB content if it differs
      const awarenessStates = collab?.provider?.awareness?.getStates();
      const hasOtherPeers = awarenessStates && awarenessStates.size > 1;

      if (!hasOtherPeers) {
        try {
          const currentJson = JSON.stringify(currentDoc);
          const incomingJson = JSON.stringify(parsedBlocks);
          if (currentJson !== incomingJson) {
            editor.replaceBlocks(currentDoc, parsedBlocks);
          }
        } catch (err) {
          console.error('Failed to sync updated blocks from server:', err);
        }
      }
    };

    syncViewerBlocks();

    const timer1 = setTimeout(syncViewerBlocks, 50);
    const timer2 = setTimeout(syncViewerBlocks, 200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [editor, parsedBlocks, collab]);

  if (!mounted) {
    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center gap-2 text-xs text-neutral-400 dark:text-zinc-500">
        <div className="w-4 h-4 rounded-full border-2 border-stone-600 dark:border-zinc-400 border-t-transparent animate-spin" />
        <span>Loading document...</span>
      </div>
    );
  }

  return (
    <div
      className="min-h-[300px] text-stone-900 select-text"
      onMouseDown={() => {
        const sideMenuView = (editor as any)?.sideMenu?.view;
        if (sideMenuView) {
          sideMenuView.isDragOrigin = false;
        }
      }}
    >
      <BlockNoteView
        editor={editor}
        theme={isDark ? 'dark' : 'light'}
        editable={false}
        sideMenu={false}
      />
    </div>
  );
}
