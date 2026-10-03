import React, { useState, useMemo } from 'react';
import type { DatabaseProperty, DatabaseItem } from '~/db/schema';
import {
  Newspaper,
  Plus,
  Clock,
  Sparkles,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '#/lib/utils';
import { getOptionBadgeStyles } from '~/lib/optionColors';

interface DatabaseFeedViewProps {
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  onUpdateItem?: (itemId: string, updates: { title?: string; properties?: Record<string, any> }) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (initialProps?: Record<string, any>) => void;
  onOpenRowDrawer?: (item: DatabaseItem) => void;
  readOnly?: boolean;
}

export const DatabaseFeedView: React.FC<DatabaseFeedViewProps> = ({
  properties,
  items,
  onDeleteItem,
  onAddItem,
  onOpenRowDrawer,
  readOnly = false,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const statusProp = properties.find((p) => p.type === 'status' || p.type === 'select');
  const dateProp = properties.find((p) => p.type === 'date' || p.type === 'created_at');
  const tagProps = properties.filter((p) => p.type === 'multi_select');

  // Group items chronologically
  const groupedFeed = useMemo(() => {
    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const groups: Record<string, DatabaseItem[]> = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      Earlier: [],
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    items.forEach((item) => {
      const d = item.createdAt ? new Date(item.createdAt) : new Date();
      const itemDateStr = d.toDateString();

      if (itemDateStr === todayStr) {
        groups['Today'].push(item);
      } else if (itemDateStr === yesterdayStr) {
        groups['Yesterday'].push(item);
      } else if (d > oneWeekAgo) {
        groups['This Week'].push(item);
      } else {
        groups['Earlier'].push(item);
      }
    });

    return Object.entries(groups).filter(([_, list]) => list.length > 0);
  }, [items]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || readOnly) return;
    onAddItem({ title: newTitle.trim() });
    setNewTitle('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-16 font-sans select-none text-stone-900 dark:text-zinc-100">
      {/* Quick Add Stream Input Header */}
      {!readOnly && (
        <form
          onSubmit={handleQuickSubmit}
          className="flex items-center gap-2 p-2 rounded-xl border border-stone-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs focus-within:border-[#1f4d3d] dark:focus-within:border-emerald-500 transition-all"
        >
          <div className="p-1.5 rounded-lg bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400">
            <Sparkles className="w-4 h-4 text-[#1f4d3d] dark:text-emerald-400" />
          </div>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Post a new page or update..."
            className="flex-1 bg-transparent text-xs font-medium text-stone-900 dark:text-zinc-100 placeholder-stone-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
              newTitle.trim()
                ? "bg-[#1f4d3d] hover:bg-[#183d30] text-white shadow-xs"
                : "bg-stone-100 dark:bg-zinc-800 text-stone-400 dark:text-zinc-600 cursor-not-allowed"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post</span>
          </button>
        </form>
      )}

      {/* Feed Timeline Items */}
      {groupedFeed.length === 0 ? (
        <div className="text-center py-16 text-stone-400 dark:text-zinc-600 space-y-2">
          <Newspaper className="w-8 h-8 mx-auto stroke-[1.5]" />
          <p className="text-xs font-medium">No items in the activity feed yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedFeed.map(([groupLabel, groupItems]) => (
            <div key={groupLabel} className="space-y-3">
              {/* Timeline Group Header */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500 bg-stone-100/70 dark:bg-zinc-800/60 px-2 py-0.5 rounded-md">
                  {groupLabel}
                </span>
                <div className="flex-1 h-[1px] bg-stone-200/60 dark:border-zinc-800/60" />
              </div>

              {/* Feed Cards with Timeline Spine */}
              <div className="relative pl-6 space-y-3 border-l-2 border-stone-200/80 dark:border-zinc-800 ml-3">
                {groupItems.map((item) => {
                  const statusVal = statusProp ? item.properties?.[statusProp.id] : null;
                  const statusOpt = statusProp?.options?.find((o) => o.id === statusVal);
                  const statusBadge = statusOpt ? getOptionBadgeStyles(statusOpt.color) : null;
                  const dateVal = dateProp ? item.properties?.[dateProp.id] : null;

                  return (
                    <div
                      key={item.id}
                      onClick={() => onOpenRowDrawer?.(item)}
                      className="relative group p-3.5 rounded-xl border border-stone-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-stone-50/70 dark:hover:bg-zinc-850 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                    >
                      {/* Timeline Node Dot */}
                      <div className="absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full bg-white dark:bg-zinc-900 border-2 border-[#1f4d3d] dark:border-emerald-500 group-hover:scale-110 transition-transform" />

                      {/* Top Header info */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-stone-800 dark:text-zinc-100 group-hover:text-[#1f4d3d] dark:group-hover:text-emerald-400 transition-colors truncate">
                            {item.title || 'Untitled'}
                          </h4>

                          {/* Property Badges & Metadata */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {statusBadge && (
                              <span
                                className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", statusBadge.className)}
                                style={statusBadge.style}
                              >
                                {statusOpt?.name}
                              </span>
                            )}

                            {tagProps.map((tp) => {
                              const tagVal = item.properties?.[tp.id];
                              if (!Array.isArray(tagVal)) return null;
                              return tagVal.map((tName: string) => {
                                const opt = tp.options?.find((o) => o.name === tName);
                                const badge = opt ? getOptionBadgeStyles(opt.color) : null;
                                return (
                                  <span
                                    key={tName}
                                    className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", badge?.className || "bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400")}
                                    style={badge?.style}
                                  >
                                    {tName}
                                  </span>
                                );
                              });
                            })}

                            {dateVal && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-400 dark:text-zinc-500">
                                <Clock className="w-3 h-3" />
                                {new Date(dateVal).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Action Button */}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenRowDrawer?.(item);
                            }}
                            className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Open page"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteItem(item.id);
                              }}
                              className="p-1 rounded-md text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
