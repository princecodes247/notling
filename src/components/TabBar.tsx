import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from '@tanstack/react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { PanelLeftOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home01Icon,
  Folder01Icon,
  Settings02Icon,
  File01Icon,
  PlusSignIcon,
  Cancel01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  LoaderCircleIcon,
  Delete02Icon,
  TableIcon,
  MoreHorizontalIcon,
} from '@hugeicons/core-free-icons';
import { useUIStore, type TabItem } from '~/store/uiStore';
import { useQueryClient } from '@tanstack/react-query';
import { getPage } from '~/server/pages';

interface TabBarProps {
  tabs: TabItem[];
  activeTabId: string | null;
  isCreatingPage?: boolean;
  onSelectTab: (tab: TabItem) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  isCreatingPage = false,
  onSelectTab,
  onCloseTab,
  onNewTab,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    sidebarOpen,
    toggleSidebar,
    reorderTabs,
    closeOtherTabs,
    closeTabsToRight,
    closeTabsToLeft,
    closeAllTabs,
  } = useUIStore();

  const [showOptionsPopover, setShowOptionsPopover] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);

  const handleTabMouseEnter = (tabId: string) => {
    if (tabId !== 'home' && tabId !== 'folders' && tabId !== 'settings' && tabId !== 'profile' && tabId !== 'trash') {
      queryClient.prefetchQuery({
        queryKey: ['page', tabId],
        queryFn: async () => await getPage({ data: tabId }),
        staleTime: 5 * 60 * 1000,
      });
    }
  };
  const isHomeActive = activeTabId === 'home' || (!activeTabId && tabs.length === 0);
  const fileTabs = tabs.filter((t) => t.id !== 'home');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Tab drag-and-drop sorting state
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'left' | 'right' | null>(null);

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    e.stopPropagation();
    setDraggedTabId(tabId);
    e.dataTransfer.setData('text/plain', tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggedTabId || draggedTabId === targetId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const pos = e.clientX < midX ? 'left' : 'right';

    setDropTargetId(targetId);
    setDropPosition(pos);
  };

  const handleDragLeave = (_e: React.DragEvent, targetId: string) => {
    if (dropTargetId === targetId) {
      setDropTargetId(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTabId || draggedTabId === targetId) {
      setDraggedTabId(null);
      setDropTargetId(null);
      setDropPosition(null);
      return;
    }

    const fromIndex = tabs.findIndex((t) => t.id === draggedTabId);
    let toIndex = tabs.findIndex((t) => t.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      if (dropPosition === 'right' && fromIndex < toIndex) {
        // Destination remains toIndex
      } else if (dropPosition === 'left' && fromIndex > toIndex) {
        // Destination remains toIndex
      } else if (dropPosition === 'right') {
        toIndex = Math.min(tabs.length - 1, toIndex + 1);
      }
      reorderTabs(fromIndex, toIndex);
    }

    setDraggedTabId(null);
    setDropTargetId(null);
    setDropPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedTabId(null);
    setDropTargetId(null);
    setDropPosition(null);
  };

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => checkScroll());
    observer.observe(el);
    return () => observer.disconnect();
  }, [fileTabs.length, checkScroll]);

  // Auto-scroll active tab into view
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const activeEl = scrollContainerRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeTabId]);

  const isTabLoading = useCallback(
    (tab: TabItem) => {
      if (
        !tab.id ||
        tab.id === 'home' ||
        tab.id === 'folders' ||
        tab.id === 'settings' ||
        tab.id === 'profile' ||
        tab.id === 'trash'
      ) {
        return false;
      }

      // If the tab already has a known title (stored in localStorage / openTabs), it's ready to display
      if (tab.title) {
        return false;
      }

      const dbState = queryClient.getQueryState(['database', tab.id]);
      const pageState = queryClient.getQueryState(['page', tab.id]);

      const isDbLoading = dbState ? dbState.status === 'pending' : false;
      const isPageLoading = pageState ? pageState.status === 'pending' : false;

      return isDbLoading || isPageLoading;
    },
    [queryClient]
  );

  const activeTabIndex = fileTabs.findIndex((t) => t.id === activeTabId);
  const hasOtherTabs = fileTabs.length > 1 || (isHomeActive && fileTabs.length > 0);
  const hasTabsToRight = activeTabIndex !== -1 && activeTabIndex < fileTabs.length - 1;
  const hasTabsToLeft = activeTabIndex > 0;
  const hasAnyTabs = fileTabs.length > 0;

  const handleToggleOptions = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showOptionsPopover && optionsButtonRef.current) {
      const rect = optionsButtonRef.current.getBoundingClientRect();
      const popoverWidth = 220;
      let left = rect.right - popoverWidth;
      if (left < 8) left = 8;
      setMenuCoords({
        top: rect.bottom + 6,
        left,
      });
      setShowOptionsPopover(true);
    } else {
      setShowOptionsPopover(false);
    }
  };

  const handleNewTabClick = () => {
    setShowOptionsPopover(false);
    onNewTab();
  };

  const handleCloseOtherTabs = () => {
    setShowOptionsPopover(false);
    const targetId = activeTabId && activeTabId !== 'home' ? activeTabId : '';
    const nextPath = closeOtherTabs(targetId);
    if (nextPath) {
      navigate({ to: nextPath as any });
    }
  };

  const handleCloseTabsToRight = () => {
    setShowOptionsPopover(false);
    if (activeTabId && activeTabId !== 'home') {
      const nextPath = closeTabsToRight(activeTabId);
      if (nextPath) {
        navigate({ to: nextPath as any });
      }
    }
  };

  const handleCloseTabsToLeft = () => {
    setShowOptionsPopover(false);
    if (activeTabId && activeTabId !== 'home') {
      const nextPath = closeTabsToLeft(activeTabId);
      if (nextPath) {
        navigate({ to: nextPath as any });
      }
    }
  };

  const handleCloseAllTabs = () => {
    setShowOptionsPopover(false);
    const nextPath = closeAllTabs();
    if (nextPath) {
      navigate({ to: nextPath as any });
    }
  };

  return (
    <div className="hidden md:flex items-center gap-1.5 px-1 py-0 shrink-0 select-none relative w-full overflow-hidden">
      {/* Sidebar Reopen Toggle Button (Shown when sidebar is closed) */}
      <AnimatePresence mode="popLayout">
        {!sidebarOpen && (
          <motion.button
            key="sidebar-open-btn"
            initial={{ opacity: 0, scale: 0.8, width: 0 }}
            animate={{ opacity: 1, scale: 1, width: 28 }}
            exit={{ opacity: 0, scale: 0.8, width: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 38, mass: 0.7 }}
            type="button"
            onClick={toggleSidebar}
            className="h-7 rounded-lg transition-colors cursor-pointer border border-transparent text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-100 hover:bg-stone-200/60 dark:hover:bg-zinc-800/60 shrink-0 z-10 overflow-hidden flex items-center justify-center p-0"
            title="Open sidebar"
          >
            <PanelLeftOpen className="w-4 h-4 text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-100 transition-colors shrink-0" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Fixed Pinned Home Icon Button */}
      <motion.button
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 38, mass: 0.7 }}
        type="button"
        onClick={() =>
          onSelectTab({ id: 'home', title: 'Home', icon: '🏠', path: '/dashboard' })
        }
        className={`p-1.5 rounded-lg transition-all cursor-pointer border flex items-center justify-center shrink-0 z-10 ${isHomeActive
          ? 'bg-white dark:bg-zinc-800 border-stone-200/90 dark:border-zinc-700/80 text-stone-900 dark:text-white shadow-xs ring-1 ring-black/[0.02]'
          : 'bg-transparent border-transparent text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-100 hover:bg-stone-200/50 dark:hover:bg-zinc-800/50'
          }`}
        title="Home"
      >
        <HugeiconsIcon icon={Home01Icon} size={15} />
      </motion.button>

      {/* Scrollable Track with Fade & Carets */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 38, mass: 0.7 }}
        className="relative flex-1 flex items-center min-w-0 overflow-hidden"
      >
        {/* Left Fade & Caret */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-3 bg-gradient-to-r from-[#f4f3ef] dark:from-[#121214] via-[#f4f3ef]/90 dark:via-[#121214]/90 to-transparent pointer-events-none">
            <button
              type="button"
              onClick={() => scrollContainerRef.current?.scrollBy({ left: -160, behavior: 'smooth' })}
              className="p-1 rounded-md bg-white dark:bg-zinc-800 shadow-xs border border-stone-200 dark:border-zinc-700 text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-100 transition-colors pointer-events-auto cursor-pointer"
              title="Scroll left"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={13} />
            </button>
          </div>
        )}

        {/* Scrollable Track */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex min-h-10 items-center gap-1.5 overflow-x-auto overflow-y-hidden whitespace-nowrap scroll-smooth py-0.5 px-0.5 w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {fileTabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isDragging = draggedTabId === tab.id;
            const isDropTarget = dropTargetId === tab.id;
            const isDropLeft = isDropTarget && dropPosition === 'left';
            const isDropRight = isDropTarget && dropPosition === 'right';
            const isLoading = isTabLoading(tab);

            return (
              <div
                key={tab.id}
                data-active={isActive}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, tab.id)}
                onDragOver={(e) => handleDragOver(e, tab.id)}
                onDragLeave={(e) => handleDragLeave(e, tab.id)}
                onDrop={(e) => handleDrop(e, tab.id)}
                onDragEnd={handleDragEnd}
                onMouseEnter={() => handleTabMouseEnter(tab.id)}
                onClick={() => onSelectTab(tab)}
                className={`group relative flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer border shrink-0 ${isDragging
                  ? 'opacity-40 border-dashed border-stone-400 dark:border-zinc-600 bg-stone-100 dark:bg-zinc-800'
                  : isActive
                    ? 'bg-white dark:bg-zinc-800 border-stone-200/90 dark:border-zinc-700/80 text-stone-900 dark:text-white font-semibold shadow-xs ring-1 ring-black/[0.02]'
                    : 'bg-transparent border-transparent text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-100 hover:bg-stone-200/40 dark:hover:bg-zinc-800/50'
                  }`}
              >
                {/* Drop Indicator Lines */}
                {isDropLeft && (
                  <span className="absolute -left-1 top-1 bottom-1 w-0.5 bg-stone-900 dark:bg-white rounded-full z-20 pointer-events-none" />
                )}
                {isDropRight && (
                  <span className="absolute -right-1 top-1 bottom-1 w-0.5 bg-stone-900 dark:bg-white rounded-full z-20 pointer-events-none" />
                )}

                {/* Tab Icon */}
                {isLoading ? (
                  <div className="w-3.5 h-3.5 rounded bg-stone-200/80 dark:bg-zinc-700/80 animate-pulse shrink-0" />
                ) : tab.icon ? (
                  <span className="text-xs shrink-0">{tab.icon}</span>
                ) : tab.id === 'folders' ? (
                  <HugeiconsIcon icon={Folder01Icon} size={14} className="text-stone-400 dark:text-zinc-500 shrink-0" />
                ) : tab.id === 'settings' ? (
                  <HugeiconsIcon icon={Settings02Icon} size={14} className="text-stone-400 dark:text-zinc-500 shrink-0" />
                ) : tab.id === 'trash' ? (
                  <HugeiconsIcon icon={Delete02Icon} size={14} className="text-stone-400 dark:text-zinc-500 shrink-0" />
                ) : tab.path?.includes('/db/') ? (
                  <HugeiconsIcon icon={TableIcon} size={14} className="text-stone-400 dark:text-zinc-500 shrink-0" />
                ) : (
                  <HugeiconsIcon icon={File01Icon} size={14} className="text-stone-400 dark:text-zinc-500 shrink-0" />
                )}

                {/* Tab Title */}
                {isLoading ? (
                  <div className="w-20 h-3 rounded bg-stone-200/80 dark:bg-zinc-700/80 animate-pulse shrink-0 my-0.5" />
                ) : (
                  <span className="max-w-[140px] truncate leading-none">
                    {tab.title || 'Untitled'}
                  </span>
                )}

                {/* Close Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className={`p-0.5 rounded hover:bg-stone-200/70 dark:hover:bg-zinc-700 text-stone-400 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-200 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  title="Close tab"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={11} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Right Fade & Caret */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pl-4 bg-gradient-to-l from-[#f4f3ef] dark:from-[#121214] via-[#f4f3ef]/90 dark:via-[#121214]/90 to-transparent pointer-events-none">
            <button
              type="button"
              onClick={() => scrollContainerRef.current?.scrollBy({ left: 160, behavior: 'smooth' })}
              className="p-1 rounded-md bg-white dark:bg-zinc-800 shadow-xs border border-stone-200 dark:border-zinc-700 text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-100 transition-colors pointer-events-auto cursor-pointer"
              title="Scroll right"
            >
              <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
            </button>
          </div>
        )}
      </motion.div>

      {/* Tab Options & Actions Popover */}
      <div className="relative shrink-0 z-10">
        <button
          ref={optionsButtonRef}
          type="button"
          disabled={isCreatingPage}
          onClick={handleToggleOptions}
          className={`p-1.5 rounded-lg transition-all cursor-pointer border flex items-center justify-center shrink-0 ${showOptionsPopover
              ? 'bg-white dark:bg-zinc-800 border-stone-200/90 dark:border-zinc-700/80 text-stone-900 dark:text-white shadow-xs'
              : 'bg-transparent border-transparent text-stone-400 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-200 hover:bg-stone-200/60 dark:hover:bg-zinc-800/60'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Tab options & actions"
          aria-label="Tab options"
          aria-expanded={showOptionsPopover}
        >
          {isCreatingPage ? (
            <HugeiconsIcon icon={LoaderCircleIcon} size={14} className="animate-spin text-stone-600 dark:text-zinc-400" />
          ) : (
            <HugeiconsIcon icon={MoreHorizontalIcon} size={15} />
          )}
        </button>

        {/* Options Dropdown Menu Portal */}
        {showOptionsPopover && menuCoords && typeof document !== 'undefined' && createPortal(
          <>
            <div
              className="fixed inset-0 z-50 bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                setShowOptionsPopover(false);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              style={{ top: `${menuCoords.top}px`, left: `${menuCoords.left}px` }}
              className="fixed w-52 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border border-stone-200/90 dark:border-zinc-800/90 rounded-xl shadow-xl py-1.5 z-50 text-xs flex flex-col ring-1 ring-black/5 dark:ring-white/5"
              onClick={(e) => e.stopPropagation()}
            >

              {/* New Tab Action */}
              <button
                type="button"
                onClick={handleNewTabClick}
                disabled={isCreatingPage}
                className="w-full text-left px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-zinc-800/70 flex items-center justify-between text-stone-700 dark:text-zinc-300 font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={PlusSignIcon} size={14} className="text-stone-500 dark:text-zinc-400 shrink-0" />
                  <span>New Document Tab</span>
                </div>
              </button>

              <div className="h-px bg-stone-200/80 dark:bg-zinc-800 my-1" />

              {/* Close Other Tabs */}
              <button
                type="button"
                onClick={handleCloseOtherTabs}
                disabled={!hasOtherTabs}
                className="w-full text-left px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-zinc-800/70 flex items-center gap-2 text-stone-700 dark:text-zinc-300 font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} className="text-stone-400 dark:text-zinc-500 shrink-0" />
                <span>Close Other Tabs</span>
              </button>

              {/* Close Tabs to Right */}
              <button
                type="button"
                onClick={handleCloseTabsToRight}
                disabled={!hasTabsToRight}
                className="w-full text-left px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-zinc-800/70 flex items-center gap-2 text-stone-700 dark:text-zinc-300 font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="text-stone-400 dark:text-zinc-500 shrink-0" />
                <span>Close Tabs to the Right</span>
              </button>

              {/* Close Tabs to Left */}
              <button
                type="button"
                onClick={handleCloseTabsToLeft}
                disabled={!hasTabsToLeft}
                className="w-full text-left px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-zinc-800/70 flex items-center gap-2 text-stone-700 dark:text-zinc-300 font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={14} className="text-stone-400 dark:text-zinc-500 shrink-0" />
                <span>Close Tabs to the Left</span>
              </button>

              <div className="h-px bg-stone-200/80 dark:bg-zinc-800 my-1" />

              {/* Close All Tabs */}
              <button
                type="button"
                onClick={handleCloseAllTabs}
                disabled={!hasAnyTabs}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 text-rose-600 dark:text-rose-400 font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <HugeiconsIcon icon={Delete02Icon} size={14} className="text-rose-500 dark:text-rose-400 shrink-0" />
                <span>Close All Tabs</span>
              </button>
            </motion.div>
          </>,
          document.body
        )}
      </div>
    </div>
  );
};
