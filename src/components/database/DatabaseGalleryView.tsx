import React from 'react';
import type { DatabaseProperty, DatabaseItem } from '~/db/schema';
import { Plus, FileText, Calendar } from 'lucide-react';

interface DatabaseGalleryViewProps {
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  onUpdateItem: (itemId: string, updates: { title?: string; properties?: Record<string, any> }) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: () => void;
  onOpenRowDrawer?: (item: DatabaseItem) => void;
  readOnly?: boolean;
}

export const DatabaseGalleryView: React.FC<DatabaseGalleryViewProps> = ({
  properties,
  items,
  onAddItem,
  onOpenRowDrawer,
  readOnly = false,
}) => {
  const statusProp = properties.find((p) => p.type === 'status' || p.type === 'select');
  const dateProp = properties.find((p) => p.type === 'date');

  return (
    <div className="w-full pb-8 select-none">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => {
          const statusVal = statusProp ? item.properties?.[statusProp.id] : null;
          const dateVal = dateProp ? item.properties?.[dateProp.id] : null;

          return (
            <div
              key={item.id}
              onClick={() => onOpenRowDrawer?.(item)}
              className="group flex flex-col rounded-2xl bg-stone-50/80 dark:bg-zinc-900/60 hover:bg-white dark:hover:bg-zinc-800/80 border border-stone-200/80 dark:border-zinc-800 transition-all duration-200 shadow-2xs hover:shadow-lg cursor-pointer overflow-hidden"
            >
              {/* Card Thumbnail Banner */}
              <div className="h-32 w-full bg-gradient-to-br from-stone-200 to-stone-300 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center text-stone-400 dark:text-zinc-600 group-hover:scale-105 transition-transform duration-300">
                <FileText className="w-10 h-10 opacity-40" />
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-zinc-100 group-hover:text-[#1f4d3d] dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {item.title || 'Untitled'}
                  </h3>
                </div>

                {/* Card Property Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-200/60 dark:border-zinc-800/60 text-[11px]">
                  {statusVal && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-medium">
                      {statusVal}
                    </span>
                  )}
                  {dateVal && (
                    <span className="flex items-center gap-1 text-stone-500 dark:text-zinc-400">
                      <Calendar className="w-3 h-3" />
                      <span>{dateVal}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Card Button */}
        {!readOnly && (
          <button
            type="button"
            onClick={onAddItem}
            className="flex flex-col items-center justify-center min-h-[200px] p-6 rounded-2xl border-2 border-dashed border-stone-200 dark:border-zinc-800 hover:border-[#1f4d3d] dark:hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 text-stone-400 dark:text-zinc-500 hover:text-[#1f4d3d] dark:hover:text-emerald-400 transition-all cursor-pointer group"
          >
            <div className="p-3 rounded-full bg-stone-100 dark:bg-zinc-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 mb-2 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold">New card</span>
          </button>
        )}
      </div>
    </div>
  );
};
