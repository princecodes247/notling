import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  PlusSignIcon,
  Cancel01Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  Delete02Icon,
  LoaderCircleIcon,
} from '@hugeicons/core-free-icons';

export interface TabOptionsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  isCreatingPage?: boolean;
  hasOtherTabs: boolean;
  hasTabsToRight: boolean;
  hasTabsToLeft: boolean;
  hasAnyTabs: boolean;
  onNewTab: () => void;
  onCloseOtherTabs: () => void;
  onCloseTabsToRight: () => void;
  onCloseTabsToLeft: () => void;
  onCloseAllTabs: () => void;
}

export const TabOptionsPopover: React.FC<TabOptionsPopoverProps> = ({
  isOpen,
  onClose,
  triggerRef,
  isCreatingPage = false,
  hasOtherTabs,
  hasTabsToRight,
  hasTabsToLeft,
  hasAnyTabs,
  onNewTab,
  onCloseOtherTabs,
  onCloseTabsToRight,
  onCloseTabsToLeft,
  onCloseAllTabs,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useState({});

  const computePosition = () => {
    if (typeof window === 'undefined' || !triggerRef.current) return null;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current?.getBoundingClientRect();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const popWidth = popoverRect?.width || 200;
    const popHeight = popoverRect?.height || 210;

    let top = triggerRect.bottom + 6;
    if (top + popHeight > viewportHeight - 12 && triggerRect.top - popHeight - 6 > 12) {
      top = triggerRect.top - popHeight - 6;
    }

    let left = triggerRect.right - popWidth;
    if (left + popWidth > viewportWidth - 12) {
      left = viewportWidth - popWidth - 12;
    }
    if (left < 12) {
      left = 12;
    }

    return {
      top: Math.max(12, top),
      left: Math.max(12, left),
    };
  };

  useLayoutEffect(() => {
    if (isOpen) {
      forceUpdate({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => forceUpdate({});

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, triggerRef, onClose]);

  if (typeof document === 'undefined') return null;

  const pos = isOpen && triggerRef.current ? computePosition() : null;

  return createPortal(
    <AnimatePresence>
      {isOpen && pos && (
        <motion.div
          key="tab-options-popover-panel"
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            zIndex: 99999,
          }}
          className="w-52 bg-white dark:bg-[#18181b] border border-stone-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 z-50 text-xs flex flex-col font-sans select-none antialiased"
          onClick={(e) => e.stopPropagation()}
        >
          {/* New Tab Action */}
          <button
            type="button"
            disabled={isCreatingPage}
            onClick={() => {
              onClose();
              onNewTab();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-zinc-800/70 flex items-center justify-between text-stone-700 dark:text-zinc-300 font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2">
              {isCreatingPage ? (
                <HugeiconsIcon icon={LoaderCircleIcon} size={14} className="animate-spin text-stone-500 dark:text-zinc-400 shrink-0" />
              ) : (
                <HugeiconsIcon icon={PlusSignIcon} size={14} className="text-stone-500 dark:text-zinc-400 shrink-0" />
              )}
              <span>New Document Tab</span>
            </div>
          </button>

          <div className="h-px bg-stone-100 dark:bg-zinc-800 my-1" />

          {/* Close Other Tabs */}
          <button
            type="button"
            disabled={!hasOtherTabs}
            onClick={() => {
              onClose();
              onCloseOtherTabs();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-zinc-800/70 flex items-center gap-2 text-stone-700 dark:text-zinc-300 font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} className="text-stone-500 dark:text-zinc-400 shrink-0" />
            <span>Close Other Tabs</span>
          </button>

          {/* Close Tabs to Right */}
          <button
            type="button"
            disabled={!hasTabsToRight}
            onClick={() => {
              onClose();
              onCloseTabsToRight();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-zinc-800/70 flex items-center gap-2 text-stone-700 dark:text-zinc-300 font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="text-stone-500 dark:text-zinc-400 shrink-0" />
            <span>Close Tabs to the Right</span>
          </button>

          {/* Close Tabs to Left */}
          <button
            type="button"
            disabled={!hasTabsToLeft}
            onClick={() => {
              onClose();
              onCloseTabsToLeft();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-zinc-800/70 flex items-center gap-2 text-stone-700 dark:text-zinc-300 font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} className="text-stone-500 dark:text-zinc-400 shrink-0" />
            <span>Close Tabs to the Left</span>
          </button>

          <div className="h-px bg-stone-100 dark:bg-zinc-800 my-1" />

          {/* Close All Tabs */}
          <button
            type="button"
            disabled={!hasAnyTabs}
            onClick={() => {
              onClose();
              onCloseAllTabs();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 text-rose-600 dark:text-rose-400 font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <HugeiconsIcon icon={Delete02Icon} size={14} className="text-rose-500 dark:text-rose-400 shrink-0" />
            <span>Close All Tabs</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
