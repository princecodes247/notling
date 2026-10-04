import React, { useState } from 'react';
import type { DatabaseProperty, DatabaseItem } from '~/db/schema';
import { Plus, FileText, Trash2, GripVertical, Edit3, ArrowRightLeft } from 'lucide-react';
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
  relatedItemsLookup?: Record<string, { id: string; databaseId: string; title: string; pageId?: string | null }>;
}

export const DatabaseListView: React.FC<DatabaseListViewProps> = ({
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

  // Find all badge/tag-like properties to display on the right
  const tagProps = properties.filter(
    (p) => p.type === 'status' || p.type === 'select' || p.type === 'multi_select'
  );
  const relationProps = properties.filter((p) => p.type === 'relation');

  return (
    <div className="w-full space-y-0.5 pb-16 select-none font-sans pt-1">
      {items.map((item) => {
        const isEditing = editingItemId === item.id;

        return (
          <div
            key={item.id}
            onClick={() => {
              if (!isEditing) onOpenRowDrawer?.(item);
            }}
            className="group relative flex items-center justify-between min-h-[34px] px-2 py-1 rounded-[4px] hover:bg-stone-100 dark:hover:bg-[#202020] transition-colors cursor-pointer text-stone-900 dark:text-zinc-100"
          >
            {/* Left Section: Drag Handle, Document Icon, Title, Quick Edit */}
            <div className="flex items-center gap-2 min-w-0 flex-1 pr-4">
              {/* Drag Handle on hover */}
              <div className="opacity-0 group-hover:opacity-100 text-stone-400 dark:text-zinc-600 transition-opacity shrink-0 -ml-1">
                <GripVertical className="w-3.5 h-3.5" />
              </div>

              {/* Document Icon */}
              <FileText className="w-4 h-4 text-stone-400 dark:text-zinc-500 shrink-0 stroke-[1.75]" />

              {/* Title / Inline Rename Input */}
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
                  className="w-full max-w-md text-[13px] font-normal px-1.5 py-0.5 border rounded-[3px] bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 border-[#1f4d3d] dark:border-emerald-500 focus:outline-none"
                  autoFocus
                />
              ) : (
                <span className="text-[13.5px] font-normal text-stone-800 dark:text-zinc-100 truncate">
                  {item.title || 'Untitled'}
                </span>
              )}

              {/* Hover Edit / Open Trigger */}
              {!isEditing && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!readOnly) {
                      setEditingItemId(item.id);
                      setEditingTitle(item.title || '');
                    } else {
                      onOpenRowDrawer?.(item);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-stone-200/60 dark:hover:bg-zinc-700 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 transition-all shrink-0 cursor-pointer"
                  title="Edit title"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Right Section: Property Badges Aligned Neatly */}
            <div className="flex items-center gap-1.5 shrink-0">
              {tagProps.map((prop) => {
                const val = item.properties?.[prop.id];
                if (!val) return null;

                if (prop.type === 'multi_select' && Array.isArray(val)) {
                  return val.map((optName: string) => {
                    const opt = prop.options?.find((o) => o.name === optName || o.id === optName);
                    const badge = opt ? getOptionBadgeStyles(opt.color) : null;
                    return (
                      <span
                        key={`${prop.id}-${optName}`}
                        className={cn(
                          "px-2 py-0.5 rounded-[4px] text-[12px] font-normal leading-tight shrink-0",
                          badge?.className || "bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300"
                        )}
                        style={badge?.style}
                      >
                        {opt?.name || optName}
                      </span>
                    );
                  });
                }

                if (prop.type === 'select' || prop.type === 'status') {
                  const opt = prop.options?.find((o) => o.id === val || o.name === val);
                  if (!opt) return null;
                  const badge = getOptionBadgeStyles(opt.color);
                  return (
                    <span
                      key={prop.id}
                      className={cn(
                        "px-2 py-0.5 rounded-[4px] text-[12px] font-normal leading-tight shrink-0",
                        badge.className
                      )}
                      style={badge.style}
                    >
                      {opt.name}
                    </span>
                  );
                }

                return null;
              })}

              {/* Relation Badges */}
              {relationProps.map((prop) => {
                const val = item.properties?.[prop.id];
                if (!val) return null;
                const ids: string[] = Array.isArray(val) ? val : [val];
                if (ids.length === 0) return null;

                return ids.map((relId) => {
                  const rel = relatedItemsLookup[relId];
                  const label = rel?.title || 'Untitled';
                  return (
                    <span
                      key={`${prop.id}-${relId}`}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 shrink-0 max-w-[130px]"
                      title={`${prop.name}: ${label}`}
                    >
                      <ArrowRightLeft className="w-2.5 h-2.5 shrink-0 opacity-70" />
                      <span className="truncate">{label}</span>
                    </span>
                  );
                });
              })}

              {/* Hover Delete Action */}
              {!readOnly && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteItem(item.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-stone-200/60 dark:hover:bg-zinc-700 text-stone-400 hover:text-red-600 dark:hover:text-red-400 transition-all cursor-pointer ml-1"
                  title="Delete row"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Notion-Style "+ New" Row Trigger */}
      {!readOnly && (
        <button
          type="button"
          onClick={() => onAddItem()}
          className="flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-stone-400 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-200 hover:bg-stone-100/70 dark:hover:bg-[#202020] transition-colors cursor-pointer text-[13px] font-normal"
        >
          <Plus className="w-4 h-4" />
          <span>New</span>
        </button>
      )}
    </div>
  );
};
