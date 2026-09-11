import React, { useRef, useState, useEffect, useCallback } from 'react';
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
} from '@hugeicons/core-free-icons';
import { useUIStore, type TabItem } from '~/store/uiStore';

interface TabBarProps {
  tabs: TabItem[];
  activeTabId: string | null;
  onSelectTab: (tab: TabItem) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}) => {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const isHomeActive = activeTabId === 'home' || (!activeTabId && tabs.length === 0);
  const fileTabs = tabs.filter((t) => t.id !== 'home');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  return (
    <div className="flex items-center gap-1.5 px-1 py-1 shrink-0 select-none relative w-full overflow-hidden">
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
            className="h-7 rounded-lg transition-colors cursor-pointer border border-transparent text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/60 shrink-0 z-10 overflow-hidden flex items-center justify-center p-0"
            title="Open sidebar"
          >
            <PanelLeftOpen className="w-4 h-4 text-neutral-500 hover:text-neutral-800 transition-colors shrink-0" />
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
        className={`p-1.5 rounded-lg transition-all cursor-pointer border flex items-center justify-center shrink-0 z-10 ${
          isHomeActive
            ? 'bg-white border-stone-200/90 text-stone-900 shadow-xs ring-1 ring-black/[0.02]'
            : 'bg-transparent border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-200/50'
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
          <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-3 bg-gradient-to-r from-[#f4f3ef] via-[#f4f3ef]/90 to-transparent pointer-events-none">
            <button
              type="button"
              onClick={() => scrollContainerRef.current?.scrollBy({ left: -160, behavior: 'smooth' })}
              className="p-1 rounded-md bg-white shadow-xs border border-stone-200 text-stone-500 hover:text-stone-800 transition-colors pointer-events-auto cursor-pointer"
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
          className="flex items-center gap-1.5 overflow-x-auto overflow-y-hidden whitespace-nowrap scroll-smooth py-0.5 px-0.5 w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {fileTabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                data-active={isActive}
                onClick={() => onSelectTab(tab)}
                className={`group relative flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer border shrink-0 ${
                  isActive
                    ? 'bg-white border-stone-200/90 text-stone-900 font-semibold shadow-xs ring-1 ring-black/[0.02]'
                    : 'bg-transparent border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-200/40'
                }`}
              >
                {/* Tab Icon */}
                {tab.icon ? (
                  <span className="text-xs shrink-0">{tab.icon}</span>
                ) : tab.id === 'folders' ? (
                  <HugeiconsIcon icon={Folder01Icon} size={14} className="text-stone-400 shrink-0" />
                ) : tab.id === 'settings' ? (
                  <HugeiconsIcon icon={Settings02Icon} size={14} className="text-stone-400 shrink-0" />
                ) : (
                  <HugeiconsIcon icon={File01Icon} size={14} className="text-stone-400 shrink-0" />
                )}

                {/* Tab Title */}
                <span className="max-w-[140px] truncate leading-none">
                  {tab.title || 'Untitled'}
                </span>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className={`p-0.5 rounded hover:bg-stone-200/70 text-stone-400 hover:text-stone-700 transition-opacity ${
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
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
          <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pl-4 bg-gradient-to-l from-[#f4f3ef] via-[#f4f3ef]/90 to-transparent pointer-events-none">
            <button
              type="button"
              onClick={() => scrollContainerRef.current?.scrollBy({ left: 160, behavior: 'smooth' })}
              className="p-1 rounded-md bg-white shadow-xs border border-stone-200 text-stone-500 hover:text-stone-800 transition-colors pointer-events-auto cursor-pointer"
              title="Scroll right"
            >
              <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
            </button>
          </div>
        )}
      </motion.div>

      {/* Pinned New Tab (+) Button */}
      <button
        type="button"
        onClick={onNewTab}
        className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer shrink-0 z-10"
        title="New document tab"
      >
        <HugeiconsIcon icon={PlusSignIcon} size={15} />
      </button>
    </div>
  );
};
