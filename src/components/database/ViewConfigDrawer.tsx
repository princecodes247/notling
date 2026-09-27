import React from 'react';
import type { DatabaseView, DatabaseProperty } from '~/db/schema';
import { VIEW_LAYOUT_OPTIONS } from './NewViewPopover';
import { X, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface ViewConfigDrawerProps {
  isOpen: boolean;
  view: DatabaseView | null;
  properties: DatabaseProperty[];
  onClose: () => void;
  onUpdateView: (viewId: string, updates: Partial<DatabaseView>) => void;
}

export const ViewConfigDrawer: React.FC<ViewConfigDrawerProps> = ({
  isOpen,
  view,
  properties,
  onClose,
  onUpdateView,
}) => {
  if (!isOpen || !view) return null;

  const config = view.config || {};

  const handleConfigChange = (key: string, val: any) => {
    onUpdateView(view.id, {
      config: {
        ...config,
        [key]: val,
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="fixed right-4 top-20 z-40 w-80 max-h-[85vh] overflow-y-auto p-4 rounded-2xl bg-stone-900/95 dark:bg-zinc-900/95 text-stone-100 backdrop-blur-xl border border-stone-800 dark:border-zinc-800 shadow-2xl text-xs space-y-4 select-none no-scrollbar"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-3">
        <h2 className="text-sm font-semibold text-white">View options</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* View Name Input */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-stone-400">View name</label>
        <div className="relative">
          <input
            type="text"
            value={view.name}
            onChange={(e) => onUpdateView(view.id, { name: e.target.value })}
            placeholder="View name..."
            className="w-full px-3 py-2 rounded-xl bg-stone-800/80 dark:bg-zinc-800/80 border border-blue-500/80 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 text-white placeholder-stone-500 focus:outline-none transition-all font-medium"
            autoFocus
          />
        </div>
      </div>

      {/* Layout Selection Grid */}
      <div className="space-y-2">
        <label className="text-[11px] font-medium text-stone-400">Layout</label>
        <div className="grid grid-cols-3 gap-1.5">
          {VIEW_LAYOUT_OPTIONS.slice(0, 9).map((opt) => {
            const Icon = opt.icon;
            const isSelected = view.type === opt.type;
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => onUpdateView(view.id, { type: opt.type })}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400 font-semibold shadow-inner'
                    : 'border-stone-800 hover:border-stone-700 bg-stone-800/30 text-stone-300 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span className="text-[10px]">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toggles & Options */}
      <div className="space-y-3 pt-2 border-t border-stone-800/80">
        {/* Show page icon */}
        <div className="flex items-center justify-between">
          <span className="text-stone-300 font-medium">Show page icon</span>
          <button
            type="button"
            onClick={() => handleConfigChange('showPageIcon', !(config.showPageIcon ?? true))}
            className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
              config.showPageIcon ?? true ? 'bg-blue-600' : 'bg-stone-700'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                config.showPageIcon ?? true ? 'right-0.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* Wrap all content */}
        <div className="flex items-center justify-between">
          <span className="text-stone-300 font-medium">Wrap all content</span>
          <button
            type="button"
            onClick={() => handleConfigChange('wrapContent', !config.wrapContent)}
            className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
              config.wrapContent ? 'bg-blue-600' : 'bg-stone-700'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                config.wrapContent ? 'right-0.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* Group by property */}
        <div className="flex items-center justify-between">
          <span className="text-stone-300 font-medium">Group by</span>
          <select
            value={config.groupByPropertyId || ''}
            onChange={(e) => handleConfigChange('groupByPropertyId', e.target.value)}
            className="px-2 py-1 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 focus:outline-none"
          >
            <option value="">Default</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Color columns */}
        <div className="flex items-center justify-between">
          <span className="text-stone-300 font-medium">Color columns</span>
          <button
            type="button"
            onClick={() => handleConfigChange('colorColumns', !(config.colorColumns ?? true))}
            className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
              config.colorColumns ?? true ? 'bg-blue-600' : 'bg-stone-700'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                config.colorColumns ?? true ? 'right-0.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* Open pages in */}
        <div className="flex items-center justify-between">
          <span className="text-stone-300 font-medium">Open pages in</span>
          <div className="flex items-center gap-1 text-stone-400">
            <span>Side peek</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
