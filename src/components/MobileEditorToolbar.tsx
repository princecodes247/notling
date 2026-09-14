import React, { useState, useEffect } from 'react';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Indent,
  Outdent,
  Bold,
  Italic,
  Strikethrough,
  Code,
  MoreHorizontal,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  ImageIcon,
  AtSign,
  Palette,
  Copy,
  Trash2,
  Link,
  ChevronDown,
  Check,
  Undo,
  Redo,
} from 'lucide-react';
import { useIsMobile } from '~/hooks/useIsMobile';
import { BottomSheet } from './BottomSheet';

interface MobileEditorToolbarProps {
  editor: any;
  onOpenMentionModal?: () => void;
  onOpenMediaPicker?: (tab: 'upload' | 'link' | 'unsplash' | 'giphy') => void;
}

interface BlockTypeOption {
  id: string;
  type: string;
  level?: number;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const BLOCK_TYPES: BlockTypeOption[] = [
  { id: 'paragraph', type: 'paragraph', label: 'Text', description: 'Plain text paragraph', icon: Type },
  { id: 'h1', type: 'heading', level: 1, label: 'Heading 1', description: 'Large section title', icon: Heading1 },
  { id: 'h2', type: 'heading', level: 2, label: 'Heading 2', description: 'Medium section title', icon: Heading2 },
  { id: 'h3', type: 'heading', level: 3, label: 'Heading 3', description: 'Small section title', icon: Heading3 },
  { id: 'bullet', type: 'bulletListItem', label: 'Bulleted list', description: 'Simple bullet points', icon: List },
  { id: 'number', type: 'numberedListItem', label: 'Numbered list', description: 'Sequential list with numbers', icon: ListOrdered },
  { id: 'todo', type: 'checkListItem', label: 'To-do list', description: 'Track tasks with checkboxes', icon: CheckSquare },
  { id: 'code', type: 'codeBlock', label: 'Code block', description: 'Code snippet with syntax formatting', icon: Code },
  { id: 'quote', type: 'quote', label: 'Quote', description: 'Highlighted quote callout', icon: Quote },
  { id: 'divider', type: 'divider', label: 'Divider', description: 'Visual horizontal line separator', icon: Minus },
];

const COLOR_PALETTE = [
  { label: 'Default', value: 'default', textColor: '#0f172a', bgColor: '#f8fafc' },
  { label: 'Gray', value: 'gray', textColor: '#64748b', bgColor: '#f1f5f9' },
  { label: 'Brown', value: 'brown', textColor: '#78350f', bgColor: '#fef3c7' },
  { label: 'Orange', value: 'orange', textColor: '#ea580c', bgColor: '#fff7ed' },
  { label: 'Yellow', value: 'yellow', textColor: '#ca8a04', bgColor: '#fefce8' },
  { label: 'Green', value: 'green', textColor: '#16a34a', bgColor: '#f0fdf4' },
  { label: 'Blue', value: 'blue', textColor: '#2563eb', bgColor: '#eff6ff' },
  { label: 'Purple', value: 'purple', textColor: '#9333ea', bgColor: '#faf5ff' },
  { label: 'Pink', value: 'pink', textColor: '#db2777', bgColor: '#fdf2f8' },
  { label: 'Red', value: 'red', textColor: '#dc2626', bgColor: '#fef2f2' },
];

export const MobileEditorToolbar: React.FC<MobileEditorToolbarProps> = ({
  editor,
  onOpenMediaPicker,
  onOpenMentionModal,
}) => {
  const isMobile = useIsMobile();
  const [activeBlock, setActiveBlock] = useState<any>(null);
  const [activeStyles, setActiveStyles] = useState<Record<string, boolean>>({});
  const [activeSheet, setActiveSheet] = useState<'insert' | 'turnInto' | 'actions' | 'color' | null>(null);
  const [colorMode, setColorMode] = useState<'text' | 'bg'>('text');
  const [copiedLink, setCopiedLink] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const handleHistoryState = (e: any) => {
      if (e.detail) {
        setCanUndo(!!e.detail.canUndo);
        setCanRedo(!!e.detail.canRedo);
      }
    };
    window.addEventListener('editor-history-state', handleHistoryState);
    return () => window.removeEventListener('editor-history-state', handleHistoryState);
  }, []);

  // Sync virtual keyboard offset via VisualViewport API
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const viewport = window.visualViewport;

    const updateOffset = () => {
      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardOffset(offset);
    };

    viewport.addEventListener('resize', updateOffset);
    viewport.addEventListener('scroll', updateOffset);
    return () => {
      viewport.removeEventListener('resize', updateOffset);
      viewport.removeEventListener('scroll', updateOffset);
    };
  }, []);

  // Update active block and active text styles on cursor move or content edit
  useEffect(() => {
    if (!editor) return;

    const refreshActiveState = () => {
      try {
        const cursor = editor.getTextCursorPosition?.();
        if (cursor?.block) {
          setActiveBlock(cursor.block);
        } else if (editor.topLevelBlocks && editor.topLevelBlocks.length > 0) {
          setActiveBlock(editor.topLevelBlocks[editor.topLevelBlocks.length - 1]);
        }

        const styles = editor.getActiveStyles?.() || {};
        setActiveStyles(styles);
      } catch {
        // ignore fallback
      }
    };

    refreshActiveState();

    const unsubSelection = editor.onSelectionChange?.(refreshActiveState);
    const unsubChange = editor.onChange?.(refreshActiveState);

    return () => {
      unsubSelection?.();
      unsubChange?.();
    };
  }, [editor]);

  if (!isMobile || !editor) {
    return null;
  }

  const currentBlock = activeBlock || editor.topLevelBlocks?.[0];

  const handleFormat = (style: 'bold' | 'italic' | 'strike' | 'code') => {
    try {
      editor.toggleStyles({ [style]: true });
      setActiveStyles(editor.getActiveStyles?.() || {});
      editor.focus?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveUp = () => {
    if (!currentBlock) return;
    try {
      if (typeof editor.moveBlocksUp === 'function') {
        editor.moveBlocksUp();
      } else {
        const prev = editor.getPrevBlock?.(currentBlock);
        if (prev) {
          editor.moveBlocks([currentBlock], prev, 'before');
        }
      }
      editor.focus?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveDown = () => {
    if (!currentBlock) return;
    try {
      if (typeof editor.moveBlocksDown === 'function') {
        editor.moveBlocksDown();
      } else {
        const next = editor.getNextBlock?.(currentBlock);
        if (next) {
          editor.moveBlocks([currentBlock], next, 'after');
        }
      }
      editor.focus?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleIndent = () => {
    try {
      editor.nestBlock?.();
      editor.focus?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOutdent = () => {
    try {
      editor.unnestBlock?.();
      editor.focus?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleInsertBlock = (option: BlockTypeOption) => {
    if (!currentBlock) return;
    try {
      const isCurrentEmpty =
        (!currentBlock.content || (Array.isArray(currentBlock.content) && currentBlock.content.length === 0)) &&
        currentBlock.type === 'paragraph';

      const updateData: any = { type: option.type };
      if (option.level) {
        updateData.props = { level: option.level };
      }

      if (isCurrentEmpty) {
        editor.updateBlock(currentBlock, updateData);
      } else {
        editor.insertBlocks([updateData], currentBlock, 'after');
      }

      setActiveSheet(null);
      editor.focus?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTurnInto = (option: BlockTypeOption) => {
    if (!currentBlock) return;
    try {
      const updateData: any = { type: option.type };
      if (option.level) {
        updateData.props = { ...currentBlock.props, level: option.level };
      }
      editor.updateBlock(currentBlock, updateData);
      setActiveSheet(null);
      editor.focus?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicate = () => {
    if (!currentBlock) return;
    try {
      const copy = JSON.parse(JSON.stringify(currentBlock));
      delete copy.id;
      editor.insertBlocks([copy], currentBlock, 'after');
      setActiveSheet(null);
      editor.focus?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = () => {
    if (!currentBlock) return;
    try {
      editor.removeBlocks([currentBlock]);
      setActiveSheet(null);
      editor.focus?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyLink = () => {
    if (!currentBlock?.id) return;
    const link = `${window.location.origin}${window.location.pathname}#${currentBlock.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => {
      setCopiedLink(false);
      setActiveSheet(null);
    }, 1200);
  };

  const handleSetColor = (color: string, isBg: boolean) => {
    if (!currentBlock) return;
    try {
      if (isBg) {
        editor.updateBlock(currentBlock, {
          props: { ...currentBlock.props, backgroundColor: color },
        });
      } else {
        editor.updateBlock(currentBlock, {
          props: { ...currentBlock.props, textColor: color },
        });
      }
      setActiveSheet(null);
      editor.focus?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismissKeyboard = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  return (
    <>
      {/* Dynamic Action Bottom Sheet */}
      <BottomSheet
        isOpen={!!activeSheet}
        onClose={() => setActiveSheet(null)}
        offsetBottom={keyboardOffset}
        title={
          activeSheet === 'insert'
            ? 'Insert Block'
            : activeSheet === 'turnInto'
            ? 'Turn Block Into'
            : activeSheet === 'actions'
            ? 'Block Actions'
            : activeSheet === 'color'
            ? 'Color & Highlight'
            : undefined
        }
        bodyClassName="p-3 flex flex-col gap-1"
      >
        {/* 1. Insert Block Sheet */}
        {activeSheet === 'insert' && (
          <div className="grid grid-cols-1 gap-1">
            {BLOCK_TYPES.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleInsertBlock(opt)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-stone-100 dark:hover:bg-zinc-800/80 active:bg-stone-200/70 dark:active:bg-zinc-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-stone-200/80 dark:border-zinc-700/60 text-stone-700 dark:text-zinc-300 flex items-center justify-center shrink-0 shadow-2xs">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-stone-900 dark:text-zinc-100">{opt.label}</span>
                    <span className="text-[10.5px] text-stone-500 dark:text-zinc-400 truncate">{opt.description}</span>
                  </div>
                </button>
              );
            })}

            {/* Media & Mention Options */}
            <button
              type="button"
              onClick={() => {
                setActiveSheet(null);
                onOpenMediaPicker?.('upload');
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-stone-100 dark:hover:bg-zinc-800/80 active:bg-stone-200/70 dark:active:bg-zinc-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-stone-200/80 dark:border-zinc-700/60 text-stone-700 dark:text-zinc-300 flex items-center justify-center shrink-0 shadow-2xs">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-stone-900 dark:text-zinc-100">Upload Image</span>
                <span className="text-[10.5px] text-stone-500 dark:text-zinc-400">Insert photo from device or library</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSheet(null);
                onOpenMentionModal?.();
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-stone-100 dark:hover:bg-zinc-800/80 active:bg-stone-200/70 dark:active:bg-zinc-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-stone-200/80 dark:border-zinc-700/60 text-stone-700 dark:text-zinc-300 flex items-center justify-center shrink-0 shadow-2xs">
                <AtSign className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-stone-900 dark:text-zinc-100">Link Page</span>
                <span className="text-[10.5px] text-stone-500 dark:text-zinc-400">Mention another workspace page</span>
              </div>
            </button>
          </div>
        )}

        {/* 2. Turn Into Sheet */}
        {activeSheet === 'turnInto' && (
          <div className="flex flex-col gap-1">
            {BLOCK_TYPES.filter((b) => b.id !== 'divider').map((opt) => {
              const Icon = opt.icon;
              const isCurrent =
                currentBlock?.type === opt.type &&
                (!opt.level || currentBlock?.props?.level === opt.level);

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleTurnInto(opt)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                    isCurrent ? 'bg-stone-200/70 dark:bg-zinc-800 font-semibold text-stone-900 dark:text-zinc-100' : 'hover:bg-stone-100 dark:hover:bg-zinc-800/60 text-stone-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 flex items-center justify-center text-stone-700 dark:text-zinc-300 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-stone-900 dark:text-zinc-100">{opt.label}</span>
                  </div>
                  {isCurrent && <Check className="w-4 h-4 text-stone-900 dark:text-zinc-100 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* 3. Block Actions Sheet */}
        {activeSheet === 'actions' && (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setActiveSheet('turnInto')}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-left hover:bg-stone-100 dark:hover:bg-zinc-800/60 active:bg-stone-200/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Type className="w-4 h-4 text-stone-500 dark:text-zinc-400" />
                <span className="text-xs font-medium text-stone-900 dark:text-zinc-100">Turn into...</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveSheet('color')}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-left hover:bg-stone-100 dark:hover:bg-zinc-800/60 active:bg-stone-200/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Palette className="w-4 h-4 text-stone-500 dark:text-zinc-400" />
                <span className="text-xs font-medium text-stone-900 dark:text-zinc-100">Color &amp; Highlight</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleDuplicate}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-left hover:bg-stone-100 dark:hover:bg-zinc-800/60 active:bg-stone-200/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Copy className="w-4 h-4 text-stone-500 dark:text-zinc-400" />
                <span className="text-xs font-medium text-stone-900 dark:text-zinc-100">Duplicate block</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-left hover:bg-stone-100 dark:hover:bg-zinc-800/60 active:bg-stone-200/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Link className="w-4 h-4 text-stone-500 dark:text-zinc-400" />
                <span className="text-xs font-medium text-stone-900 dark:text-zinc-100">
                  {copiedLink ? 'Copied link to clipboard!' : 'Copy block link'}
                </span>
              </div>
            </button>

            <div className="h-px bg-stone-200/70 dark:bg-zinc-800 my-1" />

            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 active:bg-rose-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Delete block</span>
              </div>
            </button>
          </div>
        )}

        {/* 4. Color Sheet */}
        {activeSheet === 'color' && (
          <div className="flex flex-col gap-3 p-1">
            {/* Mode Toggle */}
            <div className="flex p-0.5 rounded-lg bg-stone-200/60 dark:bg-zinc-800/80 text-xs font-medium">
              <button
                type="button"
                onClick={() => setColorMode('text')}
                className={`flex-1 py-1.5 rounded-md text-center transition-all ${
                  colorMode === 'text' ? 'bg-white dark:bg-zinc-700 text-stone-900 dark:text-zinc-100 font-semibold shadow-2xs' : 'text-stone-600 dark:text-zinc-400'
                }`}
              >
                Text Color
              </button>
              <button
                type="button"
                onClick={() => setColorMode('bg')}
                className={`flex-1 py-1.5 rounded-md text-center transition-all ${
                  colorMode === 'bg' ? 'bg-white dark:bg-zinc-700 text-stone-900 dark:text-zinc-100 font-semibold shadow-2xs' : 'text-stone-600 dark:text-zinc-400'
                }`}
              >
                Background Highlight
              </button>
            </div>

            {/* Color Items */}
            <div className="grid grid-cols-2 gap-1.5">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => handleSetColor(c.value, colorMode === 'bg')}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-stone-100 dark:hover:bg-zinc-800 active:bg-stone-200/60 border border-stone-200/70 dark:border-zinc-800 text-xs"
                >
                  <div
                    className="w-4 h-4 rounded-full border border-stone-300 dark:border-zinc-700 shrink-0"
                    style={{ backgroundColor: colorMode === 'bg' ? c.bgColor : c.textColor }}
                  />
                  <span className="font-medium text-stone-800 dark:text-zinc-200">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Floating Apple-Style Docked Mobile Accessory Bar */}
      <div
        className="md:hidden fixed left-0 right-0 z-40 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-xl border-t border-stone-200/90 dark:border-zinc-800/90 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] px-2.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-between select-none transition-[bottom] duration-75"
        style={{ bottom: `${keyboardOffset}px` }}
      >
        {/* Scrollable Toolbar Strip */}
        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5 min-w-0 flex-1">
          {/* 1. Insert Block Button (+) */}
          <button
            type="button"
            onClick={() => setActiveSheet('insert')}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-zinc-950 shadow-2xs hover:bg-stone-800 dark:hover:bg-zinc-200 active:scale-95 transition-all shrink-0"
            aria-label="Insert block"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Undo Button */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('editor-undo'))}
            disabled={!canUndo}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all shrink-0 ${
              canUndo
                ? 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800 active:scale-95'
                : 'text-stone-300 dark:text-zinc-700 opacity-40 cursor-not-allowed'
            }`}
            aria-label="Undo"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>

          {/* Redo Button */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('editor-redo'))}
            disabled={!canRedo}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all shrink-0 ${
              canRedo
                ? 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800 active:scale-95'
                : 'text-stone-300 dark:text-zinc-700 opacity-40 cursor-not-allowed'
            }`}
            aria-label="Redo"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>

          {/* 2. Turn Into / Style Badge */}
          <button
            type="button"
            onClick={() => setActiveSheet('turnInto')}
            className="flex items-center gap-1 px-2.5 h-8 rounded-lg bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200/70 dark:hover:bg-zinc-700/70 text-stone-800 dark:text-zinc-200 text-xs font-medium active:scale-95 transition-all shrink-0 border border-stone-200/80 dark:border-zinc-700/60"
            aria-label="Turn block into..."
          >
            <Type className="w-3.5 h-3.5 text-stone-600 dark:text-zinc-400" />
            <span className="max-w-[70px] truncate text-[11px]">
              {currentBlock?.type === 'heading'
                ? `H${currentBlock?.props?.level || 1}`
                : currentBlock?.type === 'bulletListItem'
                  ? 'Bullet'
                  : currentBlock?.type === 'numberedListItem'
                    ? 'Number'
                    : currentBlock?.type === 'checkListItem'
                      ? 'To-do'
                      : currentBlock?.type === 'codeBlock'
                        ? 'Code'
                        : currentBlock?.type === 'quote'
                          ? 'Quote'
                          : 'Text'}
            </span>
          </button>

          <div className="w-px h-5 bg-stone-200 dark:bg-zinc-800 shrink-0 mx-0.5" />

          {/* 3. Move Up (Reordering) */}
          <button
            type="button"
            onClick={handleMoveUp}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800 active:scale-95 transition-all shrink-0"
            aria-label="Move block up"
          >
            <ArrowUp className="w-4 h-4" />
          </button>

          {/* 4. Move Down (Reordering) */}
          <button
            type="button"
            onClick={handleMoveDown}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800 active:scale-95 transition-all shrink-0"
            aria-label="Move block down"
          >
            <ArrowDown className="w-4 h-4" />
          </button>

          {/* 5. Indent & Outdent */}
          <button
            type="button"
            onClick={handleIndent}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800 active:scale-95 transition-all shrink-0"
            aria-label="Indent"
          >
            <Indent className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleOutdent}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800 active:scale-95 transition-all shrink-0"
            aria-label="Outdent"
          >
            <Outdent className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-stone-200 dark:bg-zinc-800 shrink-0 mx-0.5" />

          {/* 6. Formatting: Bold, Italic, Strike, Code */}
          <button
            type="button"
            onClick={() => handleFormat('bold')}
            className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold transition-all shrink-0 ${activeStyles.bold ? 'bg-stone-900 dark:bg-white text-white dark:text-zinc-950' : 'text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800'
              }`}
            aria-label="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleFormat('italic')}
            className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium transition-all shrink-0 ${activeStyles.italic ? 'bg-stone-900 dark:bg-white text-white dark:text-zinc-950' : 'text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800'
              }`}
            aria-label="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleFormat('strike')}
            className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium transition-all shrink-0 ${activeStyles.strike ? 'bg-stone-900 dark:bg-white text-white dark:text-zinc-950' : 'text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800'
              }`}
            aria-label="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleFormat('code')}
            className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium transition-all shrink-0 ${activeStyles.code ? 'bg-stone-900 dark:bg-white text-white dark:text-zinc-950' : 'text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800'
              }`}
            aria-label="Inline code"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          {/* 7. More Block Actions (•••) */}
          <button
            type="button"
            onClick={() => setActiveSheet('actions')}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 active:scale-95 transition-all shrink-0"
            aria-label="More block actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Dismiss Keyboard Action */}
        <button
          type="button"
          onClick={handleDismissKeyboard}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-stone-400 dark:text-zinc-500 hover:text-stone-800 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 active:scale-95 transition-all shrink-0 ml-1"
          aria-label="Dismiss keyboard"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </>
  );
};
