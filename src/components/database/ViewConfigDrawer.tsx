import React from 'react';
import type { DatabaseView, DatabaseProperty } from '~/db/schema';
import { VIEW_LAYOUT_OPTIONS } from './NewViewPopover';
import { X, Trash2, Download } from 'lucide-react';
import { motion } from 'motion/react';

interface ViewConfigDrawerProps {
  isOpen: boolean;
  view: DatabaseView | null;
  properties: DatabaseProperty[];
  onClose: () => void;
  onUpdateView: (viewId: string, updates: Partial<DatabaseView>) => void;
  onDeleteView?: (viewId: string) => void;
  canDelete?: boolean;
  onExport?: () => void;
}

export const ViewConfigDrawer: React.FC<ViewConfigDrawerProps> = ({
  isOpen,
  view,
  properties,
  onClose,
  onUpdateView,
  onDeleteView,
  canDelete = false,
  onExport,
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

  const groupableProps = properties.filter(
    (p) => p.type === 'status' || p.type === 'select' || p.type === 'multi_select' || p.type === 'checkbox'
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="fixed right-4 top-20 z-40 w-80 max-h-[85vh] overflow-y-auto p-4 rounded-lg bg-white dark:bg-[#18181b] text-stone-900 dark:text-zinc-100 border border-stone-200/80 dark:border-zinc-800 shadow-xl text-xs space-y-4 select-none no-scrollbar"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-zinc-800/80 pb-3">
        <h2 className="text-xs font-semibold text-stone-900 dark:text-white">View options</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* View Name Input */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
          View name
        </label>
        <input
          type="text"
          value={view.name}
          onChange={(e) => onUpdateView(view.id, { name: e.target.value })}
          placeholder="View name..."
          className="w-full px-2.5 py-1.5 rounded-md bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 focus:border-[#1f4d3d] dark:focus:border-emerald-500 text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none transition-all font-medium text-xs"
        />
      </div>

      {/* Layout Selection Grid */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
          Layout
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {VIEW_LAYOUT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = view.type === opt.type;
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => onUpdateView(view.id, { type: opt.type })}
                className={`flex flex-col items-center justify-center p-2 rounded-md border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#1f4d3d] dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-[#1f4d3d] dark:text-emerald-400 font-semibold'
                    : 'border-stone-200/80 dark:border-zinc-800 hover:border-stone-300 dark:hover:border-zinc-700 bg-stone-50/50 dark:bg-zinc-900/50 text-stone-600 dark:text-zinc-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span className="text-[10px]">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Group by property */}
      {(view.type === 'board' || view.type === 'chart' || view.type === 'gallery' || view.type === 'list') && (
        <div className="space-y-1.5 pt-2 border-t border-stone-200/60 dark:border-zinc-800/80">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
            Group By Property
          </label>
          <select
            value={config.groupByPropertyId || ''}
            onChange={(e) => handleConfigChange('groupByPropertyId', e.target.value || null)}
            className="w-full px-2.5 py-1.5 rounded-md bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-stone-800 dark:text-zinc-200 focus:outline-none text-xs font-medium cursor-pointer"
          >
            <option value="">Default (First Status / Select Property)</option>
            {groupableProps.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.type})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Toggles & Options */}
      <div className="space-y-3 pt-2 border-t border-stone-200/60 dark:border-zinc-800/80">
        {/* Show page icon */}
        <div className="flex items-center justify-between">
          <span className="text-stone-700 dark:text-zinc-300 font-medium">Show page icon</span>
          <button
            type="button"
            onClick={() => handleConfigChange('showPageIcon', !(config.showPageIcon ?? true))}
            className={`w-8 h-4.5 rounded-full transition-colors relative cursor-pointer ${
              config.showPageIcon ?? true ? 'bg-[#1f4d3d] dark:bg-emerald-600' : 'bg-stone-300 dark:bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                config.showPageIcon ?? true ? 'right-0.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* Wrap all content */}
        <div className="flex items-center justify-between">
          <span className="text-stone-700 dark:text-zinc-300 font-medium">Wrap content</span>
          <button
            type="button"
            onClick={() => handleConfigChange('wrapContent', !config.wrapContent)}
            className={`w-8 h-4.5 rounded-full transition-colors relative cursor-pointer ${
              config.wrapContent ? 'bg-[#1f4d3d] dark:bg-emerald-600' : 'bg-stone-300 dark:bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                config.wrapContent ? 'right-0.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Export Database Action */}
      {onExport && (
        <div className="pt-3 border-t border-stone-200/60 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={() => {
              onClose();
              onExport();
            }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-stone-500 dark:text-zinc-400" />
            <span>Export database</span>
          </button>
        </div>
      )}

      {/* Delete View Action */}
      {canDelete && onDeleteView && (
        <div className="pt-3 border-t border-stone-200/60 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={() => {
              onDeleteView(view.id);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete view</span>
          </button>
        </div>
      )}
    </motion.div>
  );
};
