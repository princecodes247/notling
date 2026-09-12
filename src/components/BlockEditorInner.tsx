import React, { useEffect, useLayoutEffect, useCallback, useRef, useState, useMemo } from 'react';
import {
  useCreateBlockNote,
  SideMenuController,
  SideMenu,
  DragHandleMenu,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import type { Page } from '~/db/schema';
import { useUIStore } from '~/store/uiStore';
import { updatePageContent } from '~/server/pages';
import { getSession } from '~/server/auth';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useCollaboration } from '~/lib/collaboration';
import {
  Search,
  ChevronRight,
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
  unfreezeMenu?: () => void;
  userName?: string | null;
  pageUpdatedAt?: Date | string | null;
}

const CustomActionMenu: React.FC<CustomActionMenuProps> = ({ editor, block, unfreezeMenu, userName, pageUpdatedAt }) => {
  const [search, setSearch] = useState('');
  const [openFlyout, setOpenFlyout] = useState<null | 'turnInto' | 'color'>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const flyoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const { setSaveStatus } = useUIStore();
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
      if (typeof page.content === 'string') return JSON.parse(page.content);
      if (Array.isArray(page.content) && page.content.length > 0) return page.content;
    } catch (e) {
      console.error('Failed to parse page content JSON', e);
    }
    return undefined;
  }, [page.id, page.content]);

  const editorOptions = useMemo(() => {
    const opts: any = {
      initialContent,
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

  const editor = useCreateBlockNote(editorOptions, [collab]);

  const editorRef = useRef(editor);
  const pageIdRef = useRef(page.id);
  const hasUserEditedRef = useRef<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    editorRef.current = editor;
    pageIdRef.current = page.id;
  }, [editor, page.id]);

  // Seed editor content from database if editor document is blank
  useEffect(() => {
    if (!editor || !initialContent || initialContent.length === 0 || isInitializedRef.current) return;
    const currentDoc = editor.document;
    const isDocEmpty =
      currentDoc.length === 0 ||
      (currentDoc.length === 1 &&
        currentDoc[0].type === 'paragraph' &&
        (!currentDoc[0].content || (Array.isArray(currentDoc[0].content) && currentDoc[0].content.length === 0)));

    if (isDocEmpty) {
      try {
        editor.replaceBlocks(editor.document, initialContent);
        isInitializedRef.current = true;
      } catch (err) {
        console.error('Failed to populate editor with initial content:', err);
      }
    } else {
      isInitializedRef.current = true;
    }
  }, [editor, initialContent]);

  const performSave = async () => {
    try {
      const currentBlocks = editorRef.current.document;

      // Critical protection against wiping content on refresh/mount:
      // Never overwrite existing DB content if current document is empty unless the user explicitly edited.
      if (initialContent && initialContent.length > 0) {
        const isCurrentEmpty =
          currentBlocks.length === 0 ||
          (currentBlocks.length === 1 &&
            currentBlocks[0].type === 'paragraph' &&
            (!currentBlocks[0].content || (Array.isArray(currentBlocks[0].content) && currentBlocks[0].content.length === 0)));
        if (isCurrentEmpty && !hasUserEditedRef.current) {
          console.warn('Blocked autosave: editor document is blank and user has not performed explicit edits.');
          pendingSaveRef.current = false;
          setSaveStatus('idle');
          return;
        }
      }

      const plainText = extractPlainTextFromBlocks(currentBlocks);

      await updatePageContent({
        data: {
          pageId: pageIdRef.current,
          content: currentBlocks,
          contentText: plainText,
        },
      });
      pendingSaveRef.current = false;
      hasUserEditedRef.current = false;
      setSaveStatus('saved');
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
    } catch (err) {
      console.error('Autosave failed:', err);
      setSaveStatus('idle');
    }
  };

  const handleContentChange = useCallback(() => {
    // Only schedule autosave if user actually typed or interacted
    if (!hasUserEditedRef.current) return;

    setSaveStatus('saving');
    pendingSaveRef.current = true;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, 500);
  }, []);

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

  // Sync remote block updates when another editor saves in real time (only when user is not focused/typing)
  useEffect(() => {
    if (!editor || pendingSaveRef.current || hasUserEditedRef.current || editor.isFocused()) return;
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
  }, [editor, page.content, page.updatedAt]);

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
      onMouseDown={(e) => {
        hasUserEditedRef.current = true;
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
        theme="light"
        sideMenu={false}
        onChange={handleContentChange}
      >
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
                    unfreezeMenu={props.unfreezeMenu}
                    userName={userName}
                    pageUpdatedAt={page.updatedAt}
                  />
                </DragHandleMenu>
              )}
            />
          )}
        />
      </BlockNoteView>
    </div>
  );
};
