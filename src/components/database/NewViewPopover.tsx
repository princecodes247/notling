import React, { useRef, useEffect } from 'react';
import {
  Table,
  Kanban,
  LayoutGrid,
  List,
  PieChart,
  LayoutDashboard,
  Clock,
  Newspaper,
  Map,
  Calendar,
  FileText,
  Plus,
} from 'lucide-react';
import { motion } from 'motion/react';

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
  { type: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { type: 'timeline', label: 'Timeline', icon: Clock },
  { type: 'feed', label: 'Feed', icon: Newspaper },
  { type: 'map', label: 'Map', icon: Map },
  { type: 'calendar', label: 'Calendar', icon: Calendar },
  { type: 'form', label: 'Form', icon: FileText },
];

interface NewViewPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLayout: (type: string, defaultName: string) => void;
}

export const NewViewPopover: React.FC<NewViewPopoverProps> = ({
  isOpen,
  onClose,
  onSelectLayout,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -6 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      ref={popoverRef}
      className="absolute top-full left-0 mt-2 z-50 w-[380px] p-3 rounded-2xl bg-stone-900/95 dark:bg-zinc-900/95 text-white backdrop-blur-xl border border-stone-800 dark:border-zinc-800 shadow-2xl overflow-hidden text-xs select-none"
    >
      {/* Popover Subtitle Header */}
      <div className="px-2 pb-2 text-[11px] font-medium text-stone-400 dark:text-zinc-400 tracking-wide">
        Add a new view
      </div>

      {/* Layout Options Grid (4 Columns) */}
      <div className="grid grid-cols-4 gap-1.5 py-1">
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
              className="group flex flex-col items-center justify-center p-3 rounded-xl bg-stone-800/40 dark:bg-zinc-800/40 hover:bg-stone-800 dark:hover:bg-zinc-800 border border-transparent hover:border-stone-700/80 dark:hover:border-zinc-700/80 transition-all duration-150 cursor-pointer active:scale-95"
            >
              <div className="p-2 rounded-lg bg-stone-800/80 dark:bg-zinc-800/80 group-hover:bg-stone-700 dark:group-hover:bg-zinc-700 text-stone-200 dark:text-zinc-200 transition-colors mb-1.5 shadow-2xs">
                <Icon className="w-4 h-4 stroke-[1.8]" />
              </div>
              <span className="text-[11px] font-medium text-stone-300 dark:text-zinc-300 group-hover:text-white transition-colors truncate max-w-full">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom Data Source Divider */}
      <div className="mt-2 pt-2 border-t border-stone-800/80 dark:border-zinc-800/80">
        <button
          type="button"
          onClick={() => {
            onSelectLayout('table', 'Table');
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-stone-800/80 dark:hover:bg-zinc-800/80 text-stone-300 dark:text-zinc-300 hover:text-white transition-colors cursor-pointer text-left font-medium"
        >
          <Plus className="w-3.5 h-3.5 text-stone-400" />
          <span>New data source</span>
        </button>
      </div>
    </motion.div>
  );
};
