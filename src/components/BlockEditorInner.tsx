import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  useCreateBlockNote,
  SideMenuController,
  SideMenu,
  AddBlockButton,
  DragHandleButton,
  DragHandleMenu,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import type { Page } from '~/db/schema';
import { useUIStore } from '~/store/uiStore';
import { updatePageContent } from '~/server/pages';
import { useQueryClient } from '@tanstack/react-query';
import {
  Search,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Palette,
  Link,
  Copy,
  Trash2,
  MessageSquare,
  Sparkles,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Check,
} from 'lucide-react';

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

function getBlockStats(block: any): { words: number; chars: number } {
  let text = '';
  if (Array.isArray(block?.content)) {
    for (const item of block.content) {
      if (item.text) text += item.text + ' ';
    }
  } else if (typeof block?.content === 'string') {
    text = block.content;
  }
  const clean = text.trim();
  const chars = clean.length;
  const words = clean ? clean.split(/\s+/).filter(Boolean).length : 0;
  return { words, chars };
}

interface CustomActionMenuProps {
  editor: any;
  block: any;
  unfreezeMenu?: () => void;
}

const CustomActionMenu: React.FC<CustomActionMenuProps> = ({ editor, block, unfreezeMenu }) => {
  const [search, setSearch] = useState('');
  const [activeSubmenu, setActiveSubmenu] = useState<'main' | 'turnInto' | 'color'>('main');
  const [copiedLink, setCopiedLink] = useState(false);

  // Highlight active block while handle context menu is open
  useEffect(() => {
    if (!block?.id) return;
    const el = document.querySelector(`[data-id="${block.id}"]`);
    if (el) {
      el.classList.add('bn-block-selected-highlight');
    }
    return () => {
      if (el) {
        el.classList.remove('bn-block-selected-highlight');
      }
    };
  }, [block?.id]);

  const finishAction = () => {
    try {
      unfreezeMenu?.();
      editor?.focus?.();
    } catch {
      // fallback
    }
  };

  const stats = useMemo(() => getBlockStats(block), [block]);

  const blockTypeLabels: Record<string, string> = {
    paragraph: 'Text',
    heading: `Heading ${block?.props?.level || 1}`,
    bulletListItem: 'Bulleted list',
    numberedListItem: 'Numbered list',
    checkListItem: 'To-do list',
    codeBlock: 'Code',
    quote: 'Quote',
  };

  const currentTypeLabel = blockTypeLabels[block?.type] || 'Text';

  const turnIntoOptions = [
    { type: 'paragraph', label: 'Text', icon: Type },
    { type: 'heading', level: 1, label: 'Heading 1', icon: Heading1 },
    { type: 'heading', level: 2, label: 'Heading 2', icon: Heading2 },
    { type: 'heading', level: 3, label: 'Heading 3', icon: Heading3 },
    { type: 'bulletListItem', label: 'Bulleted list', icon: List },
    { type: 'numberedListItem', label: 'Numbered list', icon: ListOrdered },
    { type: 'checkListItem', label: 'To-do list', icon: CheckSquare },
    { type: 'codeBlock', label: 'Code', icon: Code },
    { type: 'quote', label: 'Quote', icon: Quote },
  ];

  const filteredTurnInto = turnIntoOptions.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleTurnInto = (option: typeof turnIntoOptions[0]) => {
    try {
      editor.updateBlock(block, {
        type: option.type,
        ...(option.level ? { props: { ...block.props, level: option.level } } : {}),
      });
      setActiveSubmenu('main');
      finishAction();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicate = () => {
    try {
      const blockCopy = JSON.parse(JSON.stringify(block));
      delete blockCopy.id;
      editor.insertBlocks([blockCopy], block.id, 'after');
      finishAction();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = () => {
    try {
      editor.removeBlocks([block]);
      finishAction();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}${window.location.pathname}#${block.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    finishAction();
  };

  const handleSetColor = (color: string, isBg: boolean) => {
    try {
      if (isBg) {
        editor.updateBlock(block, { props: { ...block.props, backgroundColor: color } });
      } else {
        editor.updateBlock(block, { props: { ...block.props, textColor: color } });
      }
      finishAction();
    } catch (err) {
      console.error(err);
    }
  };

  const colorOptions = [
    { label: 'Default', value: 'default', color: '#0f172a' },
    { label: 'Gray', value: 'gray', color: '#64748b' },
    { label: 'Brown', value: 'brown', color: '#78350f' },
    { label: 'Orange', value: 'orange', color: '#ea580c' },
    { label: 'Yellow', value: 'yellow', color: '#ca8a04' },
    { label: 'Green', value: 'green', color: '#16a34a' },
    { label: 'Blue', value: 'blue', color: '#2563eb' },
    { label: 'Purple', value: 'purple', color: '#9333ea' },
    { label: 'Pink', value: 'pink', color: '#db2777' },
    { label: 'Red', value: 'red', color: '#dc2626' },
  ];

  return (
    <div className="bg-white text-neutral-900 border border-neutral-200/90 shadow-2xl rounded-xl w-72 text-xs font-sans p-1.5 z-50 select-none">
      {/* Search Bar */}
      <div className="relative mb-1.5 px-1 pt-0.5">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200 focus-within:border-neutral-400 focus-within:bg-white transition-colors">
          <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <input
            type="text"
            placeholder="Search actions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Submenu Header if in submenu */}
      {activeSubmenu !== 'main' && (
        <button
          type="button"
          onClick={() => setActiveSubmenu('main')}
          className="flex items-center gap-1.5 px-2 py-1 mb-1 text-xs text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer w-full text-left font-medium"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Back to menu</span>
        </button>
      )}

      {/* Main Menu */}
      {activeSubmenu === 'main' && (
        <div className="flex flex-col gap-0.5 max-h-80 overflow-y-auto pr-0.5">
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
            Text & Actions
          </div>

          {/* Turn into */}
          <button
            type="button"
            onClick={() => setActiveSubmenu('turnInto')}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-neutral-100 text-neutral-800 hover:text-neutral-950 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-900" />
              <span>Turn into</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-neutral-400 group-hover:text-neutral-600">
              <span>{currentTypeLabel}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Color */}
          <button
            type="button"
            onClick={() => setActiveSubmenu('color')}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-neutral-100 text-neutral-800 hover:text-neutral-950 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Palette className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-900" />
              <span>Color</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600" />
          </button>

          <div className="my-1 border-t border-neutral-100" />

          {/* Copy link to block */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-neutral-100 text-neutral-800 hover:text-neutral-950 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Link className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-900" />
              <span>{copiedLink ? 'Link copied!' : 'Copy link to block'}</span>
            </div>
            <kbd className="text-[10px] font-mono text-neutral-400 group-hover:text-neutral-600 bg-neutral-100 px-1 py-0.5 rounded border border-neutral-200">⌘^L</kbd>
          </button>

          {/* Duplicate */}
          <button
            type="button"
            onClick={handleDuplicate}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-neutral-100 text-neutral-800 hover:text-neutral-950 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-900" />
              <span>Duplicate</span>
            </div>
            <kbd className="text-[10px] font-mono text-neutral-400 group-hover:text-neutral-600 bg-neutral-100 px-1 py-0.5 rounded border border-neutral-200">⌘D</kbd>
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-red-50 text-neutral-800 hover:text-red-700 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-neutral-500 group-hover:text-red-600" />
              <span>Delete</span>
            </div>
            <kbd className="text-[10px] font-mono text-neutral-400 group-hover:text-red-600 bg-neutral-100 px-1 py-0.5 rounded border border-neutral-200">Del</kbd>
          </button>

          <div className="my-1 border-t border-neutral-100" />

          {/* Comment */}
          <button
            type="button"
            onClick={() => alert('Comment feature opened')}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-neutral-100 text-neutral-800 hover:text-neutral-950 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-900" />
              <span>Comment</span>
            </div>
            <kbd className="text-[10px] font-mono text-neutral-400 group-hover:text-neutral-600 bg-neutral-100 px-1 py-0.5 rounded border border-neutral-200">⌘⇧M</kbd>
          </button>

          {/* Ask AI */}
          <button
            type="button"
            onClick={() => alert('Ask AI Assistant triggered')}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-purple-50 text-purple-700 hover:text-purple-900 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-500 group-hover:text-purple-700" />
              <span>Ask AI</span>
            </div>
            <kbd className="text-[10px] font-mono text-purple-500 group-hover:text-purple-700 bg-purple-100/60 px-1 py-0.5 rounded border border-purple-200">⌘J</kbd>
          </button>
        </div>
      )}

      {/* Turn Into Submenu */}
      {activeSubmenu === 'turnInto' && (
        <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto">
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
            Turn Into
          </div>
          {filteredTurnInto.map((opt) => {
            const IconComponent = opt.icon;
            const isSelected =
              block?.type === opt.type &&
              (!opt.level || block?.props?.level === opt.level);
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => handleTurnInto(opt)}
                className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-neutral-100 text-neutral-800 hover:text-neutral-950 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <IconComponent className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-900" />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Color Submenu */}
      {activeSubmenu === 'color' && (
        <div className="flex flex-col gap-1 max-h-72 overflow-y-auto p-1">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 px-1">
            Text Color
          </div>
          <div className="grid grid-cols-5 gap-1 mb-2">
            {colorOptions.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => handleSetColor(c.value, false)}
                className="w-full h-6 rounded flex items-center justify-center border border-neutral-200 hover:scale-105 transition-transform"
                style={{ backgroundColor: c.color }}
                title={c.label}
              />
            ))}
          </div>

          <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 px-1">
            Highlight Background
          </div>
          <div className="grid grid-cols-5 gap-1">
            {colorOptions.map((c) => (
              <button
                key={`bg-${c.label}`}
                type="button"
                onClick={() => handleSetColor(c.value, true)}
                className="w-full h-6 rounded flex items-center justify-center border border-neutral-200 hover:scale-105 transition-transform"
                style={{ backgroundColor: c.color }}
                title={`Highlight ${c.label}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-1.5 pt-2 border-t border-neutral-100 px-2 pb-0.5 text-[10px] text-neutral-400 flex flex-col gap-0.5 font-mono">
        <div>Last edited by Workspace Owner</div>
        <div>{stats.words} words, {stats.chars} characters</div>
      </div>
    </div>
  );
};

export const BlockEditorInner: React.FC<BlockEditorInnerProps> = ({ page }) => {
  const { setSaveStatus } = useUIStore();
  const queryClient = useQueryClient();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<boolean>(false);

  const initialContent = useMemo(() => {
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

  // Position cursor at the end of line on mousedown to prevent ProseMirror from placing cursor at start
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const blockEl =
      target.closest('[data-id]') ||
      target.closest('.bn-block-outer') ||
      target.closest('.bn-block-content');
    if (!blockEl) return;

    const blockId =
      blockEl.getAttribute('data-id') ||
      blockEl.closest('[data-id]')?.getAttribute('data-id');
    if (!blockId || !editor) return;

    const inlineEl =
      blockEl.querySelector('.bn-inline-content') ||
      blockEl.querySelector('[data-content-type]');
    if (!inlineEl) return;

    const rect = inlineEl.getBoundingClientRect();
    if (e.clientX > rect.right + 4) {
      e.preventDefault();
      try {
        const block = editor.getBlock(blockId);
        if (block) {
          editor.setTextCursorPosition(block, 'end');
          editor.focus();
        }
      } catch {
        // fallback
      }
    }
  };

  return (
    <div className="min-h-[420px]" onMouseDown={handleMouseDown}>
      <BlockNoteView
        editor={editor}
        theme="light"
        sideMenu={false}
        onChange={handleContentChange}
      >
        <SideMenuController
          sideMenu={(props) => (
            <SideMenu {...props}>
              <AddBlockButton {...props} />
              <div className="relative group flex items-center">
                <DragHandleButton
                  {...props}
                  dragHandleMenu={(menuProps) => (
                    <DragHandleMenu {...menuProps}>
                      <CustomActionMenu
                        editor={props.editor}
                        block={props.block}
                        unfreezeMenu={props.unfreezeMenu}
                      />
                    </DragHandleMenu>
                  )}
                />
                {/* Drag Handle Light Theme Tooltip */}
                <div className="absolute top-full left-0 mt-1.5 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out">
                  <div className="bg-white text-neutral-900 border border-neutral-200/90 shadow-lg rounded-lg px-2.5 py-1.5 text-[11px] whitespace-nowrap leading-tight font-sans">
                    <div className="font-normal text-neutral-900">
                      <strong className="font-semibold text-neutral-950">Drag</strong> to move
                    </div>
                    <div className="text-neutral-500 text-[10px] mt-0.5">
                      <strong className="font-semibold text-neutral-800">Click</strong> or <kbd className="font-mono bg-neutral-100 px-1 py-0.2 rounded text-[10px] text-neutral-700 border border-neutral-200">⌘/</kbd> for options
                    </div>
                  </div>
                </div>
              </div>
            </SideMenu>
          )}
        />
      </BlockNoteView>
    </div>
  );
};
