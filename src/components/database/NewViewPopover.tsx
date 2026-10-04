import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Table,
  Kanban,
  LayoutGrid,
  List,
  PieChart,
  Clock,
  Calendar,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ViewLayoutOption {
  type: string;
  label: string;
  icon: React.ElementType;
}

export const VIEW_LAYOUT_OPTIONS: ViewLayoutOption[] = [
  { type: 'table', label: 'Table', icon: Table },
  { type: 'board', label: 'Board', icon: Kanban },
  { type: 'gallery', label: 'Gallery', icon: LayoutGrid },
  { type: 'list', label: 'List', icon: List },
  { type: 'chart', label: 'Chart', icon: PieChart },
  { type: 'calendar', label: 'Calendar', icon: Calendar },
  { type: 'timeline', label: 'Timeline', icon: Clock },
  { type: 'form', label: 'Form builder', icon: FileText },
];

interface NewViewPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLayout: (type: string, defaultName: string) => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const NewViewPopover: React.FC<NewViewPopoverProps> = ({
  isOpen,
  onClose,
  onSelectLayout,
  triggerRef,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useState({});

  const computePosition = () => {
    if (typeof window === 'undefined' || !triggerRef?.current) return null;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current?.getBoundingClientRect();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const popWidth = Math.max(popoverRect?.width || 340, 340);
    const popHeight = popoverRect?.height || 260;

    let top = triggerRect.bottom + 6;
    if (top + popHeight > viewportHeight - 12 && triggerRect.top - popHeight - 6 > 12) {
      top = triggerRect.top - popHeight - 6;
    }

    let left = triggerRect.left;
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

    const handleScrollOrResize = () => {
      forceUpdate({});
    };

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        (!triggerRef?.current || !triggerRef.current.contains(target))
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleOutsideClick, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, onClose, triggerRef]);

  if (typeof document === 'undefined' || !isOpen) return null;

  const pos = computePosition();

  return createPortal(
    <AnimatePresence>
      {isOpen && pos && (
        <motion.div
          key="new-view-popover-panel"
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -4 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            zIndex: 99999,
          }}
          className="w-[320px] p-2 rounded-lg bg-white dark:bg-[#18181b] text-stone-900 dark:text-zinc-100 border border-stone-200/80 dark:border-zinc-800 shadow-xl overflow-hidden text-xs select-none"
        >
          {/* Popover Subtitle Header */}
          <div className="px-1.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
            Add a view
          </div>

          {/* Layout Options Grid */}
          <div className="grid grid-cols-3 gap-1 py-0.5">
            {VIEW_LAYOUT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => {
                    onSelectLayout(opt.type, opt.label);
                    onClose();
                  }}
                  className="group flex flex-col items-center justify-center p-2 rounded-md hover:bg-stone-100 dark:hover:bg-zinc-800/70 border border-transparent hover:border-stone-200/60 dark:hover:border-zinc-700/60 transition-all duration-150 cursor-pointer active:scale-95"
                >
                  <div className="p-1.5 rounded-md bg-stone-100 dark:bg-zinc-800 group-hover:bg-[#1f4d3d] dark:group-hover:bg-emerald-600 text-stone-600 dark:text-zinc-300 group-hover:text-white transition-colors mb-1">
                    <Icon className="w-3.5 h-3.5 stroke-[1.8]" />
                  </div>
                  <span className="text-[11px] font-medium text-stone-700 dark:text-zinc-300 group-hover:text-stone-950 dark:group-hover:text-white transition-colors truncate max-w-full">
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

