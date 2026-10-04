import React, { useState } from 'react';
import type { DatabaseProperty, DatabaseItem } from '~/db/schema';
import { Plus, FileText, Calendar, Trash2, Maximize2, ArrowRightLeft } from 'lucide-react';
import { cn } from '#/lib/utils';
import { getOptionBadgeStyles } from '~/lib/optionColors';

interface DatabaseGalleryViewProps {
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  onUpdateItem: (itemId: string, updates: { title?: string; properties?: Record<string, any> }) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (initialProps?: Record<string, any>) => void;
  onOpenRowDrawer?: (item: DatabaseItem) => void;
  readOnly?: boolean;
  relatedItemsLookup?: Record<string, { id: string; databaseId: string; title: string; pageId?: string | null }>;
}

export const DatabaseGalleryView: React.FC<DatabaseGalleryViewProps> = ({
  properties,
  items,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onOpenRowDrawer,
  readOnly = false,
  relatedItemsLookup = {},
}) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const statusProp = properties.find((p) => p.type === 'status' || p.type === 'select');
  const dateProp = properties.find((p) => p.type === 'date');
  const tagProps = properties.filter((p) => p.type === 'multi_select');
  const relationProps = properties.filter((p) => p.type === 'relation');

  return (
    <div className="w-full pb-12 select-none pt-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item, idx) => {
          const statusVal = statusProp ? item.properties?.[statusProp.id] : null;
          const statusOpt = statusProp?.options?.find((o) => o.id === statusVal);
          const statusBadge = statusOpt ? getOptionBadgeStyles(statusOpt.color) : null;
          const dateVal = dateProp ? item.properties?.[dateProp.id] : null;
          const isEditing = editingItemId === item.id;

          // Distinct subtle background gradients for gallery cards
          const gradients = [
            'from-amber-500/10 to-orange-500/10 dark:from-amber-950/20 dark:to-orange-950/20',
            'from-emerald-500/10 to-teal-500/10 dark:from-emerald-950/20 dark:to-teal-950/20',
            'from-blue-500/10 to-indigo-500/10 dark:from-blue-950/20 dark:to-indigo-950/20',
            'from-purple-500/10 to-pink-500/10 dark:from-purple-950/20 dark:to-pink-950/20',
            'from-rose-500/10 to-red-500/10 dark:from-rose-950/20 dark:to-red-950/20',
          ];
          const grad = gradients[idx % gradients.length];

          return (
            <div
              key={item.id}
              onClick={() => {
                if (!isEditing) onOpenRowDrawer?.(item);
              }}
              className="group flex flex-col rounded-lg bg-white dark:bg-[#18181b] hover:border-stone-300 dark:hover:border-zinc-700 border border-stone-200/70 dark:border-zinc-800/70 transition-all duration-150 shadow-2xs hover:shadow-xs cursor-pointer overflow-hidden"
            >
              {/* Card Thumbnail Banner */}
              <div className={cn("h-24 w-full bg-gradient-to-br flex items-center justify-center text-stone-400 dark:text-zinc-600 relative", grad)}>
                <FileText className="w-7 h-7 opacity-30 group-hover:scale-105 transition-transform duration-200 text-stone-600 dark:text-zinc-400" />

                {/* Top Action Overlay */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onOpenRowDrawer && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenRowDrawer(item);
                      }}
                      className="p-1 rounded bg-white/90 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-300 shadow-2xs transition-colors"
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
                      className="p-1 rounded bg-white/90 dark:bg-zinc-900/90 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 shadow-2xs transition-colors"
                      title="Delete card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                <div>
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
                      className="w-full text-xs font-semibold px-1.5 py-0.5 border rounded bg-stone-50 dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 border-[#1f4d3d] focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <h3
                      onClick={(e) => {
                        if (!readOnly) {
                          e.stopPropagation();
                          setEditingItemId(item.id);
                          setEditingTitle(item.title || '');
                        }
                      }}
                      className="text-xs font-semibold text-stone-900 dark:text-zinc-100 group-hover:text-[#1f4d3d] dark:group-hover:text-emerald-400 transition-colors line-clamp-2"
                    >
                      {item.title || 'Untitled'}
                    </h3>
                  )}
                </div>

                {/* Card Property Badges */}
                <div className="space-y-1 pt-2 border-t border-stone-100 dark:border-zinc-800/60 text-[11px]">
                  {statusVal && statusOpt && statusBadge ? (
                    <span
                      className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium", statusBadge.className)}
                      style={statusBadge.style}
                    >
                      {statusOpt.name}
                    </span>
                  ) : statusVal ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 text-[10px] font-medium">
                      {String(statusVal)}
                    </span>
                  ) : null}

                  {tagProps.map((tp) => {
                    const val = item.properties?.[tp.id];
                    if (!Array.isArray(val) || val.length === 0) return null;
                    const selected = tp.options?.filter((o) => val.includes(o.id)) || [];
                    return (
                      <div key={tp.id} className="flex flex-wrap gap-1">
                        {selected.map((opt) => {
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
                    <span className="flex items-center gap-1 text-stone-400 dark:text-zinc-500 text-[10px]">
                      <Calendar className="w-3 h-3" />
                      <span>{String(dateVal)}</span>
                    </span>
                  )}

                  {/* Relation Badges */}
                  {relationProps.map((prop) => {
                    const val = item.properties?.[prop.id];
                    if (!val) return null;
                    const ids: string[] = Array.isArray(val) ? val : [val];
                    if (ids.length === 0) return null;

                    return (
                      <div key={prop.id} className="flex flex-wrap gap-1 items-center pt-0.5">
                        {ids.map((relId) => {
                          const rel = relatedItemsLookup[relId];
                          const label = rel?.title || 'Untitled';
                          return (
                            <span
                              key={relId}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 max-w-full"
                              title={`${prop.name}: ${label}`}
                            >
                              <ArrowRightLeft className="w-2.5 h-2.5 shrink-0 opacity-70" />
                              <span className="truncate max-w-[120px]">{label}</span>
                            </span>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Card Button */}
        {!readOnly && (
          <button
            type="button"
            onClick={() => onAddItem()}
            className="flex flex-col items-center justify-center min-h-[160px] p-4 rounded-lg border border-dashed border-stone-200/80 dark:border-zinc-800 hover:border-[#1f4d3d] dark:hover:border-emerald-500 hover:bg-stone-50/50 dark:hover:bg-zinc-800/40 text-stone-400 dark:text-zinc-500 hover:text-[#1f4d3d] dark:hover:text-emerald-400 transition-all cursor-pointer group"
          >
            <div className="p-2.5 rounded-md bg-stone-100 dark:bg-zinc-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 mb-1.5 transition-colors">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium">New card</span>
          </button>
        )}
      </div>
    </div>
  );
};
