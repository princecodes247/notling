import React, { useEffect, useLayoutEffect, useCallback, useRef, useState, useMemo } from 'react';
import {
  useCreateBlockNote,
  SideMenuController,
  SideMenu,
  DragHandleMenu,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
} from '@blocknote/react';
import { filterSuggestionItems } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import type { Page } from '~/db/schema';
import { useUIStore } from '~/store/uiStore';
import { updatePageContent } from '~/server/pages';
import { getSession } from '~/server/auth';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useCollaboration } from '~/lib/collaboration';
import { getOfflineDraft, saveOfflineDraft, clearOfflineDraft, hasOfflineDraft } from '~/lib/offlineStorage';
import { useNavigate } from '@tanstack/react-router';
import { useTheme } from '~/context/ThemeContext';
import { PageMentionTooltip, type MentionSuggestionItem } from '~/components/PageMentionTooltip';
import { MobileEditorToolbar } from './MobileEditorToolbar';
import {
  Search,
  ChevronRight,
  RefreshCw,
  Palette,
  Link,
  Copy,
  Trash2,
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
  AtSign,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText as FileTextIcon,
  Camera as CameraIcon,
  Sparkles as SparklesIcon,
} from 'lucide-react';
import { MediaPickerModal, type MediaInsertPayload } from '~/components/MediaPickerModal';

interface BlockEditorInnerProps {
  page: Page;
  readOnly?: boolean;
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

function isBlocksArrayEmpty(blocks: any[]): boolean {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return true;
  if (blocks.length === 1) {
    const first = blocks[0];
    const hasNoContent = !first.content || (Array.isArray(first.content) && first.content.length === 0);
    const hasNoText = !first.text && extractPlainTextFromBlocks(blocks).trim().length === 0;
    const hasNoChildren = !first.children || (Array.isArray(first.children) && first.children.length === 0);
    if ((first.type === 'paragraph' || !first.type) && hasNoContent && hasNoText && hasNoChildren) {
      return true;
    }
  }
  return false;
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

function applyBlockHighlight(blockId: string | undefined, highlight: boolean, editor?: any) {
  if (!blockId) return;

  const selector = `[data-id="${blockId}"], [data-block-id="${blockId}"]`;
  let elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];

  if (elements.length === 0) {
    const all = Array.from(document.querySelectorAll('[data-id]'));
    const match = all.find((el) => el.getAttribute('data-id') === String(blockId));
    if (match) {
      const parent = (match.closest('.bn-block-outer') || match.closest('.bn-block') || match) as HTMLElement;
      elements = [parent];
    }
  }

  if (elements.length === 0 && editor?.sideMenu?.state?.referencePos) {
    const rect = editor.sideMenu.state.referencePos;
    const el = document.elementFromPoint(rect.left + 35, rect.top + 10);
    if (el) {
      const container = (el.closest('.bn-block-outer') || el.closest('.bn-block') || el) as HTMLElement;
      if (container) elements = [container];
    }
  }

  elements.forEach((outerEl) => {
    if (highlight) {
      outerEl.classList.add('bn-block-selected-highlight');
    } else {
      outerEl.classList.remove('bn-block-selected-highlight');
    }

    const targetNodes = [
      outerEl,
      ...Array.from(
        outerEl.querySelectorAll('.bn-block, .bn-block-content, .bn-inline-content, p, h1, h2, h3, li, div, span')
      ),
    ] as HTMLElement[];

    targetNodes.forEach((node) => {
      if (highlight) {
        node.classList.add('bn-block-selected-highlight');
        node.style.setProperty('background-color', '#dbeafe', 'important');
        node.style.setProperty('border-radius', '6px', 'important');
      } else {
        node.classList.remove('bn-block-selected-highlight');
        node.style.removeProperty('background-color');
        node.style.removeProperty('border-radius');
      }
    });
  });
}

interface FlyoutSubmenuProps {
  children: React.ReactNode;
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const FlyoutSubmenu: React.FC<FlyoutSubmenuProps> = ({
  children,
  className = '',
  onMouseEnter,
  onMouseLeave,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [positionStyle, setPositionStyle] = useState<React.CSSProperties>({
    opacity: 0,
    top: 0,
    left: '100%',
  });

  const updatePosition = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const parentEl = el.parentElement;
    if (!parentEl) return;

    const parentRect = parentEl.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;

    const margin = 6;
    const padding = 12;

    const style: React.CSSProperties = {
      opacity: 1,
    };

    // Horizontal placement: check if opening to the right fits in viewport
    const flyoutWidth = rect.width || 208;
    const spaceOnRight = vw - parentRect.right;
    const spaceOnLeft = parentRect.left;

    if (spaceOnRight < flyoutWidth + padding && spaceOnLeft >= flyoutWidth + padding) {
      style.left = 'auto';
      style.right = '100%';
      style.marginLeft = undefined;
      style.marginRight = `${margin}px`;
    } else if (spaceOnRight < flyoutWidth + padding && spaceOnLeft > spaceOnRight) {
      style.left = 'auto';
      style.right = '100%';
      style.marginLeft = undefined;
      style.marginRight = `${margin}px`;
    } else {
      style.left = '100%';
      style.right = 'auto';
      style.marginRight = undefined;
      style.marginLeft = `${margin}px`;
    }

    // Vertical placement: adjust translateY to prevent clipping top or bottom
    const flyoutHeight = rect.height;
    const flyoutTopInViewport = parentRect.top;
    const flyoutBottomInViewport = flyoutTopInViewport + flyoutHeight;

    let deltaY = 0;

    if (flyoutBottomInViewport > vh - padding) {
      deltaY = (vh - padding) - flyoutBottomInViewport;
    }

    if (flyoutTopInViewport + deltaY < padding) {
      deltaY = padding - flyoutTopInViewport;
      const maxAvailableHeight = vh - padding * 2;
      style.maxHeight = `${maxAvailableHeight}px`;
      style.overflowY = 'auto';
    }

    if (deltaY !== 0) {
      style.transform = `translateY(${deltaY}px)`;
    }

    setPositionStyle(style);
  }, []);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition]);

  useEffect(() => {
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [updatePosition]);

  return (
    <div
      ref={containerRef}
      className={`absolute top-0 z-[60] bg-white border border-neutral-200/90 shadow-lg rounded-lg text-xs font-sans p-1.5 select-none ${className}`}
      style={positionStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
};

interface CustomActionMenuProps {
  editor: any;
  block: any;
  freezeMenu?: () => void;
  unfreezeMenu?: () => void;
  userName?: string | null;
  pageUpdatedAt?: Date | string | null;
  onOpenMentionModal?: () => void;
  onOpenMediaPicker?: (tab: 'upload' | 'link' | 'unsplash' | 'giphy') => void;
}

const CustomActionMenu: React.FC<CustomActionMenuProps> = ({
  editor,
  block,
  freezeMenu,
  unfreezeMenu,
  userName,
  pageUpdatedAt,
  onOpenMentionModal,
  onOpenMediaPicker,
}) => {
  const [search, setSearch] = useState('');
  const [openFlyout, setOpenFlyout] = useState<null | 'turnInto' | 'color'>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const flyoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lock side menu frozen while action menu is open
  useEffect(() => {
    freezeMenu?.();
  }, [freezeMenu]);

  // Highlight active block while handle context menu is open
  useEffect(() => {
    if (!block?.id) return;
    const raf = requestAnimationFrame(() => {
      applyBlockHighlight(block.id, true);
    });
    return () => {
      cancelAnimationFrame(raf);
      applyBlockHighlight(block.id, false, editor);
    };
  }, [block?.id, editor]);

  const finishAction = () => {
    try {
      applyBlockHighlight(block?.id, false, editor);
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
    { label: 'Default', value: 'default', textColor: '#0f172a', bgColor: 'transparent' },
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

  const formattedDate = pageUpdatedAt
    ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(pageUpdatedAt))
    : null;

  // Flyout hover helpers — small delay prevents dismissal while moving mouse diagonally
  const openFlyoutMenu = (name: 'turnInto' | 'color') => {
    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current);
    setOpenFlyout(name);
  };

  const scheduleFlyoutClose = () => {
    flyoutTimeoutRef.current = setTimeout(() => setOpenFlyout(null), 120);
  };

  const cancelFlyoutClose = () => {
    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current);
  };

  return (
    <div className="bg-white text-neutral-900 shadow-2xl rounded w-64 text-xs font-sans p-1.5 z-50 select-none">
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

      {/* Menu items */}
      <div className="flex flex-col gap-0.5">
        <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
          Text &amp; Actions
        </div>

        {/* ── Turn into (flyout trigger) ── */}
        <div
          className="relative"
          onMouseEnter={() => openFlyoutMenu('turnInto')}
          onMouseLeave={scheduleFlyoutClose}
        >
          <button
            type="button"
            className={`flex items-center justify-between w-full px-2 py-1.5 rounded-lg transition-colors cursor-pointer group ${openFlyout === 'turnInto' ? 'bg-neutral-100 text-neutral-950' : 'hover:bg-neutral-100 text-neutral-800 hover:text-neutral-950'}`}
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

          {/* Turn Into flyout submenu */}
          {openFlyout === 'turnInto' && (
            <FlyoutSubmenu
              className="w-52"
              onMouseEnter={cancelFlyoutClose}
              onMouseLeave={scheduleFlyoutClose}
            >
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold text-neutral-400 mb-0.5">
                Turn Into
              </div>
              <div className="flex flex-col gap-0.5">
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
                      className={`flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-neutral-100 text-neutral-800 hover:text-neutral-950 transition-colors cursor-pointer group ${isSelected ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-neutral-500 group-hover:text-neutral-900'}`} />
                        <span className={isSelected ? 'text-blue-700 font-medium' : ''}>{opt.label}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </FlyoutSubmenu>
          )}
        </div>

        {/* ── Color (flyout trigger) ── */}
        <div
          className="relative"
          onMouseEnter={() => openFlyoutMenu('color')}
          onMouseLeave={scheduleFlyoutClose}
        >
          <button
            type="button"
            className={`flex items-center justify-between w-full px-2 py-1.5 rounded-lg transition-colors cursor-pointer group ${openFlyout === 'color' ? 'bg-neutral-100 text-neutral-950' : 'hover:bg-neutral-100 text-neutral-800 hover:text-neutral-950'}`}
          >
            <div className="flex items-center gap-2">
              <Palette className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-900" />
              <span>Color</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600" />
          </button>

          {/* Color flyout submenu */}
          {openFlyout === 'color' && (
            <FlyoutSubmenu
              className="w-52"
              onMouseEnter={cancelFlyoutClose}
              onMouseLeave={scheduleFlyoutClose}
            >
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold text-neutral-400 mb-0.5">
                Text Color
              </div>
              <div className="flex flex-col gap-0.5">
                {colorOptions.map((c) => (
                  <button
                    key={`text-${c.label}`}
                    type="button"
                    onClick={() => handleSetColor(c.value, false)}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer text-left w-full"
                  >
                    <span
                      className="w-5 h-5 rounded flex items-center justify-center text-[13px] font-bold leading-none shrink-0"
                      style={{ color: c.textColor, backgroundColor: c.value === 'default' ? '#f1f5f9' : c.bgColor, border: '1px solid rgba(0,0,0,0.07)' }}
                    >
                      A
                    </span>
                    <span className="text-xs text-neutral-700">{c.label}</span>
                  </button>
                ))}
              </div>

              <div className="my-1 border-t border-neutral-100" />

              <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold text-neutral-400 mb-0.5">
                Background
              </div>
              <div className="flex flex-col gap-0.5">
                {colorOptions.map((c) => (
                  <button
                    key={`bg-${c.label}`}
                    type="button"
                    onClick={() => handleSetColor(c.value, true)}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer text-left w-full"
                  >
                    <span
                      className="w-5 h-5 rounded flex items-center justify-center text-[13px] font-bold leading-none shrink-0"
                      style={{
                        backgroundColor: c.value === 'default' ? '#ffffff' : c.bgColor,
                        color: c.textColor,
                        border: c.value === 'default' ? '1px solid #e2e8f0' : `1px solid ${c.bgColor}`,
                      }}
                    >
                      A
                    </span>
                    <span className="text-xs text-neutral-700">{c.label} background</span>
                  </button>
                ))}
              </div>
            </FlyoutSubmenu>
          )}
        </div>

        <div className="my-1 border-t border-neutral-100" />

        {/* Mention page */}
        <button
          type="button"
          onClick={() => {
            finishAction();
            onOpenMentionModal?.();
          }}
          onMouseEnter={() => setOpenFlyout(null)}
          className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-amber-50 text-neutral-800 hover:text-amber-900 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <AtSign className="w-3.5 h-3.5 text-neutral-500 group-hover:text-amber-700" />
            <span>Mention page...</span>
          </div>
          <kbd className="text-[10px] font-mono text-neutral-400 group-hover:text-amber-700 bg-neutral-100 px-1 py-0.5 rounded border border-neutral-200">@</kbd>
        </button>

        {/* Media (Upload, Link, Unsplash, GIPHY) */}
        <button
          type="button"
          onClick={() => {
            finishAction();
            onOpenMediaPicker?.('upload');
          }}
          onMouseEnter={() => setOpenFlyout(null)}
          className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-blue-50 text-neutral-800 hover:text-blue-900 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5 text-neutral-500 group-hover:text-blue-700" />
            <span>Upload or embed media...</span>
          </div>
          <span className="text-[10px] font-medium text-stone-400 group-hover:text-blue-700">Media</span>
        </button>

        {/* Copy link to block */}
        <button
          type="button"
          onClick={handleCopyLink}
          onMouseEnter={() => setOpenFlyout(null)}
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
          onMouseEnter={() => setOpenFlyout(null)}
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
          onMouseEnter={() => setOpenFlyout(null)}
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
        {/* <button
          type="button"
          onClick={() => alert('Comment feature opened')}
          onMouseEnter={() => setOpenFlyout(null)}
          className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-neutral-100 text-neutral-800 hover:text-neutral-950 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-900" />
            <span>Comment</span>
          </div>
          <kbd className="text-[10px] font-mono text-neutral-400 group-hover:text-neutral-600 bg-neutral-100 px-1 py-0.5 rounded border border-neutral-200">⌘⇧M</kbd>
        </button> */}

        {/* Ask AI */}
        {/* <button
          type="button"
          onClick={() => alert('Ask AI Assistant triggered')}
          onMouseEnter={() => setOpenFlyout(null)}
          className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-purple-50 text-purple-700 hover:text-purple-900 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-500 group-hover:text-purple-700" />
            <span>Ask AI</span>
          </div>
          <kbd className="text-[10px] font-mono text-purple-500 group-hover:text-purple-700 bg-purple-100/60 px-1 py-0.5 rounded border border-purple-200">⌘J</kbd>
        </button> */}
      </div>

      {/* Footer */}
      <div className="mt-1.5 pt-2 border-t border-neutral-100 px-2 pb-0.5 text-[10px] text-neutral-400 flex flex-col gap-0.5 font-mono">
        <div>Last edited{userName ? ` by ${userName}` : ''}{formattedDate ? ` · ${formattedDate}` : ''}</div>
        <div>{stats.words} words, {stats.chars} characters</div>
      </div>
    </div>
  );
};


function isDescendant(parent: any, childId: string): boolean {
  if (!parent || !Array.isArray(parent.children)) return false;
  for (const child of parent.children) {
    if (child.id === childId) return true;
    if (isDescendant(child, childId)) return true;
  }
  return false;
}

function getOrCreateDropIndicator(): HTMLElement {
  let indicatorEl = document.getElementById('bn-custom-drop-indicator');
  if (!indicatorEl) {
    indicatorEl = document.createElement('div');
    indicatorEl.id = 'bn-custom-drop-indicator';
    indicatorEl.style.position = 'fixed';
    indicatorEl.style.pointerEvents = 'none';
    indicatorEl.style.zIndex = '99999';
    indicatorEl.style.height = '2px';
    indicatorEl.style.backgroundColor = '#2563eb';
    indicatorEl.style.borderRadius = '2px';
    indicatorEl.style.display = 'none';
    indicatorEl.style.boxShadow = '0 0 4px rgba(37, 99, 235, 0.4)';

    const dot = document.createElement('div');
    dot.className = 'bn-drop-dot';
    dot.style.position = 'absolute';
    dot.style.left = '-3px';
    dot.style.top = '-2.5px';
    dot.style.width = '7px';
    dot.style.height = '7px';
    dot.style.borderRadius = '50%';
    dot.style.backgroundColor = '#2563eb';
    indicatorEl.appendChild(dot);

    document.body.appendChild(indicatorEl);
  }
  return indicatorEl;
}

function removeDropIndicator() {
  const indicatorEl = document.getElementById('bn-custom-drop-indicator');
  if (indicatorEl) {
    indicatorEl.style.display = 'none';
  }
}

function getDropTarget(
  editor: any,
  clientX: number,
  clientY: number,
  draggedId?: string
) {
  const editorEl = editor?.prosemirrorView?.dom;
  if (!editorEl) return null;

  const blockEls = Array.from(
    editorEl.querySelectorAll('.bn-block-outer[data-id]')
  ) as HTMLElement[];

  if (blockEls.length === 0) return null;

  let targetEl: HTMLElement | null = null;
  let placement: 'before' | 'after' = 'after';

  const firstRect = blockEls[0].getBoundingClientRect();
  const lastRect = blockEls[blockEls.length - 1].getBoundingClientRect();

  if (clientY < firstRect.top + 4) {
    targetEl = blockEls[0];
    placement = 'before';
  } else if (clientY > lastRect.bottom - 4) {
    targetEl = blockEls[blockEls.length - 1];
    placement = 'after';
  } else {
    for (const el of blockEls) {
      const rect = el.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        targetEl = el;
        const midY = rect.top + rect.height / 2;
        placement = clientY < midY ? 'before' : 'after';
        break;
      }
    }

    if (!targetEl) {
      let minDistance = Infinity;
      for (const el of blockEls) {
        const rect = el.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const dist = Math.abs(clientY - midY);
        if (dist < minDistance) {
          minDistance = dist;
          targetEl = el;
          placement = clientY < midY ? 'before' : 'after';
        }
      }
    }
  }

  if (!targetEl) return null;

  const targetId = targetEl.getAttribute('data-id');
  if (!targetId) return null;

  const targetRect = targetEl.getBoundingClientRect();
  const contentEl = (targetEl.querySelector('.bn-block-content') || targetEl) as HTMLElement;
  const contentRect = contentEl.getBoundingClientRect();

  // Nesting: requires clientX to be substantially indented (> 48px to the right of content start)
  // and placed after the block.
  const isIndented = clientX > contentRect.left + 48;
  const canNest = isIndented && placement === 'after' && targetId !== draggedId;

  return {
    targetEl,
    targetId,
    targetRect,
    contentRect,
    placement,
    nest: canNest,
  };
}

function updateDropIndicator(
  editor: any,
  clientX: number,
  clientY: number,
  draggedId?: string
) {
  const dropTarget = getDropTarget(editor, clientX, clientY, draggedId);
  if (!dropTarget || dropTarget.targetId === draggedId) {
    removeDropIndicator();
    return;
  }

  const { targetRect, contentRect, placement, nest } = dropTarget;
  const indicator = getOrCreateDropIndicator();
  const y = placement === 'before' ? targetRect.top : targetRect.bottom;
  const x = nest ? contentRect.left + 24 : contentRect.left;
  const width = Math.max(targetRect.right - x, 120);

  indicator.style.display = 'block';
  indicator.style.top = `${y - 1}px`;
  indicator.style.left = `${x}px`;
  indicator.style.width = `${width}px`;
}

export const BlockEditorInner: React.FC<BlockEditorInnerProps> = ({ page }) => {
  const navigate = useNavigate();
  const { setSaveStatus, setActivePageId } = useUIStore();
  const [isMentionModalOpen, setIsMentionModalOpen] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);

  const { isDark } = useTheme();

  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaPickerInitialTab, setMediaPickerInitialTab] = useState<'upload' | 'link' | 'unsplash' | 'giphy'>('upload');
  const [mediaPickerPosition, setMediaPickerPosition] = useState<{ top: number; left: number } | null>(null);

  const getCursorPos = () => {
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect && rect.top > 0) {
          return { top: rect.bottom + 6, left: Math.max(16, rect.left) };
        }
      }
    } catch { }
    return { top: 180, left: 320 };
  };

  const handleOpenMediaPicker = useCallback((tab: 'upload' | 'link' | 'unsplash' | 'giphy' = 'upload', pos?: { top: number; left: number }) => {
    setMediaPickerInitialTab(tab);
    setMediaPickerPosition(pos || getCursorPos());
    setIsMediaPickerOpen(true);
  }, []);

  const checkMentionTrigger = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) {
      return;
    }

    const textNode =
      sel.anchorNode.nodeType === Node.TEXT_NODE
        ? sel.anchorNode
        : sel.anchorNode.lastChild?.nodeType === Node.TEXT_NODE
        ? sel.anchorNode.lastChild
        : null;

    if (!textNode || !textNode.textContent) {
      return;
    }

    const text = textNode.textContent;
    const offset = sel.anchorOffset;
    const textBefore = text.slice(0, offset);

    const atIdx = textBefore.lastIndexOf('@');
    if (atIdx === -1) {
      setIsMentionModalOpen(false);
      return;
    }

    const query = textBefore.slice(atIdx + 1);
    if (/\s/.test(query)) {
      setIsMentionModalOpen(false);
      return;
    }

    let rect: DOMRect | null = null;
    try {
      const range = document.createRange();
      range.setStart(textNode, atIdx);
      range.setEnd(textNode, offset);
      rect = range.getBoundingClientRect();
    } catch { }

    const top = rect && rect.bottom > 0 ? rect.bottom + 6 : 200;
    const left = rect && rect.left > 0 ? Math.max(16, rect.left) : 300;

    setTooltipPosition({ top, left });
    setMentionSearchQuery(query);
    setMentionSelectedIndex(0);
    setIsMentionModalOpen(true);
  }, []);
  const queryClient = useQueryClient();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<boolean>(false);
  const draggedBlockRef = useRef<any>(null);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: () => getSession(),
    staleTime: 5 * 60 * 1000,
  });
  const userName = session?.name ?? session?.email ?? null;

  const collab = useCollaboration(page.id, userName, session?.email);

  const initialContent = useMemo(() => {
    try {
      const draft = getOfflineDraft(page.id);
      if (draft?.content) return draft.content;

      if (typeof page.content === 'string') return JSON.parse(page.content);
      if (Array.isArray(page.content) && page.content.length > 0) return page.content;
    } catch (e) {
      console.error('Failed to parse page content JSON', e);
    }
    return undefined;
  }, [page.id, page.content]);

  const editorOptions = useMemo(() => {
    const opts: any = {
      initialContent: initialContent && initialContent.length > 0 ? initialContent : undefined,
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
  }, [initialContent, collab]);

  const editor = useCreateBlockNote(editorOptions, [page.id, collab?.doc, collab?.provider]);

  const getSlashMenuItems = useCallback(
    async (query: string) => {
      const defaultItems = getDefaultReactSlashMenuItems(editor);

      const customMediaItems: any[] = [
        {
          title: 'Image',
          subtext: 'Upload or embed an image, Unsplash photo, or GIF',
          aliases: ['image', 'img', 'photo', 'picture', 'upload'],
          group: 'Media',
          icon: <ImageIcon className="w-4 h-4 text-blue-500" />,
          onItemClick: () => {
            window.dispatchEvent(
              new CustomEvent('open-media-picker', {
                detail: { tab: 'upload' },
              })
            );
          },
        },
        {
          title: 'Video',
          subtext: 'Upload or embed a video file',
          aliases: ['video', 'mp4', 'movie', 'clip'],
          group: 'Media',
          icon: <VideoIcon className="w-4 h-4 text-purple-500" />,
          onItemClick: () => {
            window.dispatchEvent(
              new CustomEvent('open-media-picker', {
                detail: { tab: 'link' },
              })
            );
          },
        },
        {
          title: 'File',
          subtext: 'Upload any file or document',
          aliases: ['file', 'pdf', 'doc', 'attachment', 'upload'],
          group: 'Media',
          icon: <FileTextIcon className="w-4 h-4 text-amber-500" />,
          onItemClick: () => {
            window.dispatchEvent(
              new CustomEvent('open-media-picker', {
                detail: { tab: 'upload' },
              })
            );
          },
        },
        {
          title: 'Unsplash',
          subtext: 'Search and insert high-res photos from Unsplash',
          aliases: ['unsplash', 'photo', 'picture', 'stock', 'gallery'],
          group: 'Media',
          icon: <CameraIcon className="w-4 h-4 text-emerald-500" />,
          onItemClick: () => {
            window.dispatchEvent(
              new CustomEvent('open-media-picker', {
                detail: { tab: 'unsplash' },
              })
            );
          },
        },
        {
          title: 'GIPHY',
          subtext: 'Search and insert animated GIFs from GIPHY',
          aliases: ['giphy', 'gif', 'animation', 'sticker', 'meme'],
          group: 'Media',
          icon: <SparklesIcon className="w-4 h-4 text-amber-400" />,
          onItemClick: () => {
            window.dispatchEvent(
              new CustomEvent('open-media-picker', {
                detail: { tab: 'giphy' },
              })
            );
          },
        },
      ];

      const filteredDefaults = defaultItems.filter(
        (item) => !['Image', 'Video', 'File', 'Audio'].includes(item.title)
      );

      return filterSuggestionItems([...filteredDefaults, ...customMediaItems], query);
    },
    [editor]
  );

  const editorRef = useRef(editor);
  const pageIdRef = useRef(page.id);
  const hasUserEditedRef = useRef<boolean>(false);

  // Reset edit state whenever page ID changes
  useEffect(() => {
    editorRef.current = editor;
    pageIdRef.current = page.id;
    hasUserEditedRef.current = false;
    pendingSaveRef.current = false;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, [editor, page.id]);

  // If editor document is blank and initialContent exists, seed from database content
  useEffect(() => {
    if (!editor || !initialContent || isBlocksArrayEmpty(initialContent)) return;

    const seedContentIfNeeded = () => {
      const currentDoc = editor.document;
      if (isBlocksArrayEmpty(currentDoc)) {
        try {
          editor.replaceBlocks(currentDoc, initialContent);
        } catch (err) {
          console.error('Error seeding initial collaborative content:', err);
        }
      }
    };

    seedContentIfNeeded();

    const timer1 = setTimeout(seedContentIfNeeded, 50);
    const timer2 = setTimeout(seedContentIfNeeded, 200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [editor, initialContent]);

  const performSave = async () => {
    try {
      const currentBlocks = editorRef.current?.document;
      if (!currentBlocks) return;

      // Critical protection against wiping content on refresh/mount:
      // Never overwrite existing DB content if current document is empty while initial content was non-empty.
      if (initialContent && !isBlocksArrayEmpty(initialContent) && isBlocksArrayEmpty(currentBlocks)) {
        console.warn('Blocked autosave: editor document is blank while initial content was non-empty.');
        pendingSaveRef.current = false;
        setSaveStatus('idle');
        return;
      }

      const hasDraft = hasOfflineDraft(pageIdRef.current);

      if (!hasUserEditedRef.current && !hasDraft) {
        pendingSaveRef.current = false;
        setSaveStatus('idle');
        return;
      }

      const plainText = extractPlainTextFromBlocks(currentBlocks);

      // Always update local draft immediately
      saveOfflineDraft(pageIdRef.current, currentBlocks, plainText);

      if (typeof window !== 'undefined' && !navigator.onLine) {
        setSaveStatus('offline');
        return;
      }

      const res = await updatePageContent({
        data: {
          pageId: pageIdRef.current,
          content: currentBlocks,
          contentText: plainText,
        },
      }).catch(() => null);

      if (!res) {
        if (typeof window !== 'undefined' && !navigator.onLine) {
          setSaveStatus('offline');
        } else {
          console.warn('Server save failed or rejected, offline draft remains in local storage');
          setSaveStatus('offline');
        }
        return;
      }

      // Saved successfully on server - clear local draft
      clearOfflineDraft(pageIdRef.current);
      pendingSaveRef.current = false;
      hasUserEditedRef.current = false;
      setSaveStatus('saved');
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
    } catch (err) {
      console.error('Autosave failed:', err);
      setSaveStatus('offline');
    }
  };

  // Reconnection auto-sync effect
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleReconnect = () => {
      if (hasOfflineDraft(page.id)) {
        setSaveStatus('saving');
        performSave();
      }
    };

    window.addEventListener('online', handleReconnect);
    return () => window.removeEventListener('online', handleReconnect);
  }, [page.id]);

  const handleContentChange = useCallback(() => {
    // Only schedule autosave if user actually typed or interacted
    if (!hasUserEditedRef.current) return;

    const currentBlocks = editorRef.current?.document;
    if (initialContent && !isBlocksArrayEmpty(initialContent) && currentBlocks && isBlocksArrayEmpty(currentBlocks)) {
      console.warn('Blocked handleContentChange: current blocks are empty while initial content is non-empty.');
      return;
    }

    setSaveStatus('saving');
    pendingSaveRef.current = true;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, 500);
  }, [initialContent]);

  const handleSelectMentionPage = useCallback(
    (item: MentionSuggestionItem) => {
      try {
        let linkText = '';
        let href = '';

        if (item.type === 'user') {
          linkText = `@${item.title}`;
          href = `mailto:${item.email || item.id}`;
        } else {
          linkText = `@${item.icon || '📄'} ${item.title}`;
          href = `/dashboard/p/${item.id}`;
        }

        // Consume preceding typed '@query' text from DOM selection / text node
        const sel = window.getSelection();
        if (sel && sel.anchorNode) {
          const textNode =
            sel.anchorNode.nodeType === Node.TEXT_NODE
              ? sel.anchorNode
              : sel.anchorNode.lastChild?.nodeType === Node.TEXT_NODE
              ? sel.anchorNode.lastChild
              : null;

          if (textNode && textNode.textContent) {
            const txt = textNode.textContent;
            const offset = sel.anchorOffset;
            const textBefore = txt.slice(0, offset);
            const atIdx = textBefore.lastIndexOf('@');
            if (atIdx !== -1) {
              textNode.textContent = txt.slice(0, atIdx) + txt.slice(offset);
              try {
                const range = document.createRange();
                range.setStart(textNode, atIdx);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
              } catch { }
            }
          }
        }

        const inlineLinkObj = {
          type: 'link' as const,
          href,
          content: [
            {
              type: 'text' as const,
              text: linkText,
              styles: {},
            },
          ],
        };

        const trailingSpaceObj = {
          type: 'text' as const,
          text: ' ',
          styles: {},
        };

        if (editor && typeof (editor as any).insertInlineContent === 'function') {
          (editor as any).insertInlineContent([inlineLinkObj, trailingSpaceObj]);
        } else if (editor) {
          const currentBlock =
            editor.getTextCursorPosition()?.block || editor.document[editor.document.length - 1];
          editor.insertBlocks(
            [
              {
                type: 'paragraph',
                content: [inlineLinkObj],
              },
            ],
            currentBlock,
            'after'
          );
        }

        setIsMentionModalOpen(false);
        hasUserEditedRef.current = true;
        handleContentChange();

      } catch (err) {
        console.error('Error inserting mention:', err);
      }
    },
    [editor, handleContentChange, queryClient]
  );

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href') || '';
      const match = href.match(/\/(?:dashboard\/p|share)\/([a-f0-9-]{36})/i);
      if (match && match[1]) {
        e.preventDefault();
        e.stopPropagation();
        const targetId = match[1];
        setActivePageId(targetId);
        navigate({ to: '/dashboard/p/$pageId', params: { pageId: targetId } });
      }
    }
  };

  // Ensure mention links are marked contentEditable="false" so browsers treat them as atomic nodes
  useEffect(() => {
    const markMentionLinksAtomic = () => {
      const links = document.querySelectorAll(
        '.bn-editor a[href*="/dashboard/p/"], .bn-editor a[href*="/share/"], .bn-editor a[href^="mailto:"]'
      );
      links.forEach((a) => {
        if (a.getAttribute('contenteditable') !== 'false') {
          a.setAttribute('contenteditable', 'false');
        }
      });
    };

    markMentionLinksAtomic();
    const timer = setInterval(markMentionLinksAtomic, 1000);
    return () => clearInterval(timer);
  }, [page.id]);

  // Listen for text selection changes to check live @ mention context
  useEffect(() => {
    const handleSelectionOrInput = () => {
      setTimeout(() => checkMentionTrigger(), 10);
    };

    document.addEventListener('selectionchange', handleSelectionOrInput);
    window.addEventListener('keyup', handleSelectionOrInput);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionOrInput);
      window.removeEventListener('keyup', handleSelectionOrInput);
    };
  }, [checkMentionTrigger]);

  // Handle keyboard navigation for mention popover & atomic Backspace deletion
  useEffect(() => {
    const handleKeyDownCapture = (e: KeyboardEvent) => {
      if (isMentionModalOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          setMentionSelectedIndex((prev) => prev + 1);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          setMentionSelectedIndex((prev) => Math.max(0, prev - 1));
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          e.stopPropagation();
          // Find matching member or page by index
          const sessionData = queryClient.getQueryData(['session']) as any;
          const wsId = sessionData?.workspaceId || '';
          const workspaceUsers = (queryClient.getQueryData(['workspaceUsers']) || []) as any[];
          const tree = (queryClient.getQueryData(['pageTree', wsId]) || []) as any[];

          const userItems: MentionSuggestionItem[] = workspaceUsers.map((u: any) => ({
            type: 'user',
            id: u.id,
            title: u.name || u.email.split('@')[0],
            subtitle: u.email,
            icon: u.avatarUrl,
            email: u.email,
          }));

          const pageItems: MentionSuggestionItem[] = [];
          function rec(list: any[]) {
            for (const n of list) {
              if (n.id !== page.id) {
                pageItems.push({
                  type: 'page',
                  id: n.id,
                  title: n.title || 'Untitled Page',
                  icon: n.icon,
                });
              }
              if (n.children) rec(n.children);
            }
          }
          rec(tree);

          const cleanQuery = mentionSearchQuery.toLowerCase().trim();
          const filteredUsers = userItems.filter(
            (u) => u.title.toLowerCase().includes(cleanQuery) || (u.subtitle && u.subtitle.toLowerCase().includes(cleanQuery))
          );
          const filteredPages = pageItems.filter((p) => p.title.toLowerCase().includes(cleanQuery));

          const allSuggestions = [...filteredUsers, ...filteredPages];
          const selected = allSuggestions[mentionSelectedIndex] || allSuggestions[0];
          if (selected) {
            handleSelectMentionPage(selected);
          } else {
            setIsMentionModalOpen(false);
          }
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setIsMentionModalOpen(false);
          return;
        }
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        const sel = window.getSelection();
        if (sel && sel.anchorNode) {
          let targetEl: HTMLElement | null =
            sel.anchorNode.nodeType === Node.ELEMENT_NODE
              ? (sel.anchorNode as HTMLElement)
              : sel.anchorNode.parentElement;

          let linkEl = targetEl?.closest('a[href*="/dashboard/p/"], a[href*="/share/"], a[href^="mailto:"]');

          if (!linkEl && sel.anchorNode.nodeType === Node.TEXT_NODE) {
            const parent = sel.anchorNode.parentElement;
            if (parent) {
              const matchSelector = 'a[href*="/dashboard/p/"], a[href*="/share/"], a[href^="mailto:"]';
              if (sel.anchorOffset === 0 && parent.previousElementSibling?.matches(matchSelector)) {
                linkEl = parent.previousElementSibling as HTMLElement;
              } else if (
                sel.anchorOffset === (sel.anchorNode.textContent?.length || 0) &&
                parent.nextElementSibling?.matches(matchSelector)
              ) {
                linkEl = parent.nextElementSibling as HTMLElement;
              }
            }
          }

          if (linkEl) {
            e.preventDefault();
            e.stopPropagation();
            linkEl.remove();
            hasUserEditedRef.current = true;
            handleContentChange();
    
            return;
          }
        }
      }
    };

    const handleCustomOpen = (e: Event) => {
      const customEv = e as CustomEvent<{ top?: number; left?: number }>;
      setTooltipPosition(customEv.detail?.top ? { top: customEv.detail.top, left: customEv.detail.left || 300 } : { top: 200, left: 300 });
      setMentionSearchQuery('');
      setMentionSelectedIndex(0);
      setIsMentionModalOpen(true);
    };

    const handleCustomMediaOpen = (e: Event) => {
      const customEv = e as CustomEvent<{ tab?: 'upload' | 'link' | 'unsplash' | 'giphy'; top?: number; left?: number }>;
      handleOpenMediaPicker(
        customEv.detail?.tab || 'upload',
        customEv.detail?.top ? { top: customEv.detail.top, left: customEv.detail.left || 300 } : getCursorPos()
      );
    };

    window.addEventListener('keydown', handleKeyDownCapture, true);
    window.addEventListener('open-page-mention', handleCustomOpen);
    window.addEventListener('open-media-picker', handleCustomMediaOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDownCapture, true);
      window.removeEventListener('open-page-mention', handleCustomOpen);
      window.removeEventListener('open-media-picker', handleCustomMediaOpen);
    };
  }, [
    isMentionModalOpen,
    mentionSearchQuery,
    mentionSelectedIndex,
    page.id,
    handleSelectMentionPage,
    handleContentChange,
    queryClient,
    handleOpenMediaPicker,
  ]);

  const handleInsertMedia = useCallback(
    (payload: MediaInsertPayload) => {
      if (!editor) return;
      try {
        const selection = editor.getTextCursorPosition();
        const currentBlock = selection?.block || editor.document[editor.document.length - 1];

        const newBlock: any = {
          type: payload.type === 'video' ? 'video' : payload.type === 'audio' ? 'audio' : payload.type === 'file' ? 'file' : 'image',
          props: {
            url: payload.url,
            ...(payload.caption ? { caption: payload.caption } : {}),
            ...(payload.name ? { name: payload.name } : {}),
          },
        };

        editor.insertBlocks([newBlock], currentBlock, 'after');
        hasUserEditedRef.current = true;
        handleContentChange();
      } catch (err) {
        console.error('Failed to insert media block:', err);
      }
    },
    [editor, handleContentChange]
  );

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

  // Sync remote block updates from DB only if collaboration is NOT active
  useEffect(() => {
    if (collab || !editor || pendingSaveRef.current || hasUserEditedRef.current || editor.isFocused()) return;
    try {
      const incomingBlocks = typeof page.content === 'string' ? JSON.parse(page.content) : page.content;
      if (Array.isArray(incomingBlocks) && incomingBlocks.length > 0) {
        const currentJson = JSON.stringify(editor.document);
        const incomingJson = JSON.stringify(incomingBlocks);
        if (currentJson !== incomingJson) {
          editor.replaceBlocks(editor.document, incomingBlocks);
        }
      }
    } catch (err) {
      console.error('Error syncing remote blocks:', err);
    }
  }, [editor, page.content, page.updatedAt, collab]);

  // Neutralize SideMenuPlugin.isDragOrigin so BlockNote NEVER dispatches deleteSelection()
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

  // Execute custom block drop
  const executeDrop = useCallback(
    (clientX: number, clientY: number) => {
      let dragged = draggedBlockRef.current;
      if (!dragged) {
        dragged = editor.getSelection()?.blocks?.[0] || editor.getTextCursorPosition()?.block;
      }
      if (!dragged || !dragged.id) return;

      const dropTarget = getDropTarget(editor, clientX, clientY, dragged.id);
      if (!dropTarget) return;

      const { targetId, placement, nest } = dropTarget;
      if (targetId === dragged.id) return;

      const draggedBlockObj = editor.getBlock(dragged.id);
      if (!draggedBlockObj) return;

      if (isDescendant(draggedBlockObj, targetId)) return;

      try {
        if (nest) {
          const targetBlockObj = editor.getBlock(targetId);
          if (!targetBlockObj) return;

          editor.removeBlocks([dragged.id]);
          const currentChildren = Array.isArray(targetBlockObj.children)
            ? targetBlockObj.children
            : [];
          editor.updateBlock(targetBlockObj, {
            children: [...currentChildren, draggedBlockObj],
          });
        } else {
          editor.removeBlocks([dragged.id]);
          editor.insertBlocks([draggedBlockObj], targetId, placement);
        }

        handleContentChange();
      } catch (err) {
        console.error('Failed to move block:', err);
      }
    },
    [editor, handleContentChange]
  );

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

  // Global window drag & drop event listeners in capture phase to take full control
  useEffect(() => {
    const handleDragStart = (_e: DragEvent) => {
      const sideMenuView = (editor as any)?.sideMenu?.view;
      if (sideMenuView) {
        sideMenuView.isDragOrigin = false;
      }
    };

    const handleDragOver = (e: DragEvent) => {
      const isOurDrag =
        !!draggedBlockRef.current ||
        (e.dataTransfer && e.dataTransfer.types.includes('blocknote/html'));
      if (!isOurDrag) return;

      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
      updateDropIndicator(editor, e.clientX, e.clientY, draggedBlockRef.current?.id);
    };

    const handleDrop = (e: DragEvent) => {
      const isOurDrag =
        !!draggedBlockRef.current ||
        (e.dataTransfer && e.dataTransfer.types.includes('blocknote/html'));
      if (!isOurDrag) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      removeDropIndicator();

      const sideMenuView = (editor as any)?.sideMenu?.view;
      if (sideMenuView) {
        sideMenuView.isDragOrigin = false;
      }

      executeDrop(e.clientX, e.clientY);

      if (editor.prosemirrorView) {
        (editor.prosemirrorView as any).dragging = null;
      }
      try {
        editor.sideMenu?.blockDragEnd?.();
      } catch { }
      draggedBlockRef.current = null;
    };

    const handleDragEnd = () => {
      removeDropIndicator();
      draggedBlockRef.current = null;
      const sideMenuView = (editor as any)?.sideMenu?.view;
      if (sideMenuView) {
        sideMenuView.isDragOrigin = false;
      }
    };

    window.addEventListener('dragstart', handleDragStart, true);
    window.addEventListener('dragover', handleDragOver, true);
    window.addEventListener('drop', handleDrop, true);
    window.addEventListener('dragend', handleDragEnd, true);

    return () => {
      window.removeEventListener('dragstart', handleDragStart, true);
      window.removeEventListener('dragover', handleDragOver, true);
      window.removeEventListener('drop', handleDrop, true);
      window.removeEventListener('dragend', handleDragEnd, true);
      removeDropIndicator();
    };
  }, [editor, executeDrop]);

  return (
    <div
      className="min-h-[420px]"
      onClick={handleContainerClick}
      onMouseDown={(e) => {
        handleMouseDown(e);
      }}
      onKeyDown={() => {
        hasUserEditedRef.current = true;
      }}
      onInput={() => {
        hasUserEditedRef.current = true;
      }}
      onPaste={() => {
        hasUserEditedRef.current = true;
      }}
    >
      <BlockNoteView
        editor={editor}
        theme={isDark ? 'dark' : 'light'}
        sideMenu={false}
        slashMenu={false}
        onChange={handleContentChange}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={getSlashMenuItems}
        />
        <SideMenuController
          sideMenu={(props) => (
            <SideMenu
              {...props}
              blockDragStart={(event, block) => {
                draggedBlockRef.current = block;
                const sideMenuView = (editor as any)?.sideMenu?.view;
                if (sideMenuView) {
                  sideMenuView.isDragOrigin = false;
                }
                props.blockDragStart(event, block);
                if (sideMenuView) {
                  sideMenuView.isDragOrigin = false;
                }
              }}
              blockDragEnd={() => {
                removeDropIndicator();
                props.blockDragEnd();
                draggedBlockRef.current = null;
              }}
              dragHandleMenu={(menuProps) => (
                <DragHandleMenu {...menuProps}>
                  <CustomActionMenu
                    editor={props.editor}
                    block={props.block}
                    freezeMenu={props.freezeMenu}
                    unfreezeMenu={props.unfreezeMenu}
                    userName={userName}
                    pageUpdatedAt={page.updatedAt}
                    onOpenMentionModal={() => {
                      setTooltipPosition(getCursorPos());
                      setMentionSearchQuery('');
                      setMentionSelectedIndex(0);
                      setIsMentionModalOpen(true);
                    }}
                    onOpenMediaPicker={handleOpenMediaPicker}
                  />
                </DragHandleMenu>
              )}
            />
          )}
        />
      </BlockNoteView>

      <MobileEditorToolbar
        editor={editor}
        onOpenMediaPicker={handleOpenMediaPicker}
        onOpenMentionModal={() => {
          setTooltipPosition(getCursorPos());
          setMentionSearchQuery('');
          setMentionSelectedIndex(0);
          setIsMentionModalOpen(true);
        }}
      />

      <PageMentionTooltip
        isOpen={isMentionModalOpen}
        onClose={() => setIsMentionModalOpen(false)}
        onSelectItem={handleSelectMentionPage}
        currentPageId={page.id}
        searchQuery={mentionSearchQuery}
        selectedIndex={mentionSelectedIndex}
        onHoverIndex={(idx) => setMentionSelectedIndex(idx)}
        position={tooltipPosition}
      />

      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelectMedia={handleInsertMedia}
        initialTab={mediaPickerInitialTab}
        position={mediaPickerPosition}
      />
    </div>
  );
};
