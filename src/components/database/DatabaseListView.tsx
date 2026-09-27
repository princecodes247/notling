import React from 'react';
import type { DatabaseProperty, DatabaseItem } from '~/db/schema';
import { Plus, FileText, Calendar, Trash2 } from 'lucide-react';

interface DatabaseListViewProps {
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  onUpdateItem: (itemId: string, updates: { title?: string; properties?: Record<string, any> }) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: () => void;
  onOpenRowDrawer?: (item: DatabaseItem) => void;
  readOnly?: boolean;
}

export const DatabaseListView: React.FC<DatabaseListViewProps> = ({
  properties,
  items,
  onDeleteItem,
  onAddItem,
  onOpenRowDrawer,
  readOnly = false,
}) => {
  const statusProp = properties.find((p) => p.type === 'status' || p.type === 'select');
  const dateProp = properties.find((p) => p.type === 'date');

  return (
    <div className="w-full max-w-4xl space-y-1 pb-8 select-none font-sans">
      <div className="divide-y divide-stone-200/70 dark:divide-zinc-800/70 border border-stone-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden bg-stone-50/40 dark:bg-zinc-900/40">
        {items.map((item) => {
          const statusVal = statusProp ? item.properties?.[statusProp.id] : null;
          const dateVal = dateProp ? item.properties?.[dateProp.id] : null;

          return (
            <div
              key={item.id}
              onClick={() => onOpenRowDrawer?.(item)}
              className="group flex items-center justify-between px-4 py-3 hover:bg-white dark:hover:bg-zinc-800/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <FileText className="w-4 h-4 text-stone-400 dark:text-zinc-500 shrink-0" />
                <span className="text-xs font-semibold text-stone-900 dark:text-zinc-100 truncate group-hover:text-[#1f4d3d] dark:group-hover:text-emerald-400 transition-colors">
                  {item.title || 'Untitled'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs shrink-0">
                {statusVal && (
                  <span className="px-2.5 py-0.5 rounded-full bg-stone-200/80 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 text-[11px] font-medium">
                    {statusVal}
                  </span>
                )}
                {dateVal && (
                  <span className="flex items-center gap-1 text-stone-400 dark:text-zinc-500 text-[11px]">
                    <Calendar className="w-3 h-3" />
                    <span>{dateVal}</span>
                  </span>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteItem(item.id);
                    }}
                    className="p-1 rounded text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="p-8 text-center text-xs text-stone-400 dark:text-zinc-500">
            No items in list
          </div>
        )}
      </div>

      {!readOnly && (
        <button
          type="button"
          onClick={onAddItem}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800/80 rounded-xl transition-colors cursor-pointer w-full mt-2"
        >
          <Plus className="w-4 h-4" />
          <span>New page</span>
        </button>
      )}
    </div>
  );
};
