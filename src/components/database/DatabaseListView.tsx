import React, { useState } from 'react';
import type { DatabaseProperty, DatabaseItem } from '~/db/schema';
import { Plus, FileText, Calendar, Trash2, Maximize2, CheckSquare, Square } from 'lucide-react';
import { cn } from '#/lib/utils';
import { getOptionBadgeStyles } from '~/lib/optionColors';

interface DatabaseListViewProps {
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  onUpdateItem: (itemId: string, updates: { title?: string; properties?: Record<string, any> }) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (initialProps?: Record<string, any>) => void;
  onOpenRowDrawer?: (item: DatabaseItem) => void;
  readOnly?: boolean;
}

export const DatabaseListView: React.FC<DatabaseListViewProps> = ({
  properties,
  items,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onOpenRowDrawer,
  readOnly = false,
}) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const statusProp = properties.find((p) => p.type === 'status' || p.type === 'select');
  const dateProp = properties.find((p) => p.type === 'date');
  const checkboxProp = properties.find((p) => p.type === 'checkbox');
  const tagProps = properties.filter((p) => p.type === 'multi_select');

  return (
    <div className="w-full max-w-4xl space-y-2 pb-12 select-none font-sans pt-1">
      <div className="divide-y divide-stone-200/60 dark:divide-zinc-800/60 border border-stone-200/70 dark:border-zinc-800/70 rounded-lg overflow-hidden bg-white dark:bg-[#18181b] shadow-2xs">
        {items.map((item) => {
          const statusVal = statusProp ? item.properties?.[statusProp.id] : null;
          const statusOpt = statusProp?.options?.find((o) => o.id === statusVal);
          const statusBadge = statusOpt ? getOptionBadgeStyles(statusOpt.color) : null;
          const dateVal = dateProp ? item.properties?.[dateProp.id] : null;
          const isChecked = checkboxProp ? Boolean(item.properties?.[checkboxProp.id]) : false;
          const isEditing = editingItemId === item.id;

          return (
            <div
              key={item.id}
              onClick={() => {
                if (!isEditing) onOpenRowDrawer?.(item);
              }}
              className="group flex items-center justify-between px-3.5 py-2.5 hover:bg-stone-50/70 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {checkboxProp ? (
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateItem(item.id, {
                        properties: {
                          ...item.properties,
                          [checkboxProp.id]: !isChecked,
                        },
                      });
                    }}
                    className="text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 shrink-0 cursor-pointer"
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-[#1f4d3d] dark:text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                ) : (
                  <FileText className="w-4 h-4 text-stone-400 dark:text-zinc-500 shrink-0" />
                )}

                {isEditing && !readOnly ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() => {
                      onUpdateItem(item.id, { title: editingTitle.trim() });
                      setEditingItemId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        onUpdateItem(item.id, { title: editingTitle.trim() });
                        setEditingItemId(null);
                      } else if (e.key === 'Escape') {
                        e.stopPropagation();
                        setEditingItemId(null);
                      }
                    }}
                    className="w-full max-w-sm text-xs font-semibold px-1.5 py-0.5 border rounded bg-stone-50 dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 border-[#1f4d3d] focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <span
                    onClick={(e) => {
                      if (!readOnly) {
                        e.stopPropagation();
                        setEditingItemId(item.id);
                        setEditingTitle(item.title || '');
                      }
                    }}
                    className={cn(
                      "text-xs font-semibold text-stone-900 dark:text-zinc-100 truncate group-hover:text-[#1f4d3d] dark:group-hover:text-emerald-400 transition-colors",
                      isChecked ? "line-through opacity-60" : ""
                    )}
                  >
                    {item.title || 'Untitled'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 text-xs shrink-0">
                {statusVal && statusOpt && statusBadge ? (
                  <span
                    className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium", statusBadge.className)}
                    style={statusBadge.style}
                  >
                    {statusOpt.name}
                  </span>
                ) : statusVal ? (
                  <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 text-[10px] font-medium">
                    {String(statusVal)}
                  </span>
                ) : null}

                {tagProps.map((tp) => {
                  const val = item.properties?.[tp.id];
                  if (!Array.isArray(val) || val.length === 0) return null;
                  const selected = tp.options?.filter((o) => val.includes(o.id)) || [];
                  return (
                    <div key={tp.id} className="hidden sm:flex items-center gap-1">
                      {selected.slice(0, 2).map((opt) => {
                        const badge = getOptionBadgeStyles(opt.color);
                        return (
                          <span
                            key={opt.id}
                            className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium", badge.className)}
                            style={badge.style}
                          >
                            {opt.name}
                          </span>
                        );
                      })}
                    </div>
                  );
                })}

                {dateVal && (
                  <span className="hidden sm:flex items-center gap-1 text-stone-400 dark:text-zinc-500 text-[11px]">
                    <Calendar className="w-3 h-3" />
                    <span>{String(dateVal)}</span>
                  </span>
                )}

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onOpenRowDrawer && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenRowDrawer(item);
                      }}
                      className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Open page"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(item.id);
                      }}
                      className="p-1 rounded text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
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
          onClick={() => onAddItem()}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800/80 rounded-md transition-colors cursor-pointer w-full mt-2"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New item</span>
        </button>
      )}
    </div>
  );
};
