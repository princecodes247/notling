import { useState } from 'react';
import type { DatabaseProperty, DatabaseItem } from '~/db/schema';
import { Plus, Trash2, Calendar, Maximize2, CheckSquare, Square } from 'lucide-react';
import { cn } from '#/lib/utils';
import { getOptionBadgeStyles } from '~/lib/optionColors';

interface DatabaseBoardViewProps {
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  groupByPropertyId?: string;
  onUpdateItem: (itemId: string, updates: { title?: string; properties?: Record<string, any> }) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (initialProperties?: Record<string, any>) => void;
  onOpenRowDrawer?: (item: DatabaseItem) => void;
  readOnly?: boolean;
}

export function DatabaseBoardView({
  properties,
  items,
  groupByPropertyId,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onOpenRowDrawer,
  readOnly = false,
}: DatabaseBoardViewProps) {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  // Find group-by property (default to status or select type prop)
  const groupProp =
    properties.find((p) => p.id === groupByPropertyId) ||
    properties.find((p) => p.type === 'status') ||
    properties.find((p) => p.type === 'select');

  const options = groupProp?.options || [
    { id: 'todo', name: 'To Do', color: '#94a3b8' },
    { id: 'in_progress', name: 'In Progress', color: '#3b82f6' },
    { id: 'done', name: 'Done', color: '#22c55e' },
  ];

  // Group items by option id
  const groupedItemsMap: Record<string, DatabaseItem[]> = {};
  options.forEach((opt) => {
    groupedItemsMap[opt.id] = [];
  });
  groupedItemsMap['no_group'] = [];

  items.forEach((item) => {
    const val = groupProp ? item.properties?.[groupProp.id] : undefined;
    if (val && groupedItemsMap[val]) {
      groupedItemsMap[val].push(item);
    } else {
      groupedItemsMap['no_group'].push(item);
    }
  });

  const columns = [...options];
  if (groupedItemsMap['no_group'].length > 0) {
    columns.push({ id: 'no_group', name: 'No Group', color: '#6b7280' });
  }

  const handleDropOnColumn = (targetColId: string) => {
    if (!draggedItemId || !groupProp) return;
    const targetItem = items.find((i) => i.id === draggedItemId);
    if (!targetItem) return;

    const currentVal = targetItem.properties?.[groupProp.id];
    const nextVal = targetColId === 'no_group' ? null : targetColId;

    if (currentVal !== nextVal) {
      onUpdateItem(draggedItemId, {
        properties: {
          ...targetItem.properties,
          [groupProp.id]: nextVal,
        },
      });
    }

    setDraggedItemId(null);
    setDragOverColumnId(null);
  };

  return (
    <div className="w-full h-full min-h-0 overflow-x-auto overflow-y-hidden pb-2 pt-1">
      <div className="flex gap-4 min-w-max items-start h-full pb-1">
        {columns.map((column) => {
          const colItems = groupedItemsMap[column.id] || [];
          const isDragOver = dragOverColumnId === column.id;

          return (
            <div
              key={column.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverColumnId !== column.id) {
                  setDragOverColumnId(column.id);
                }
              }}
              onDragLeave={() => {
                if (dragOverColumnId === column.id) {
                  setDragOverColumnId(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnColumn(column.id);
              }}
              className={cn(
                "w-72 shrink-0 bg-stone-100/60 dark:bg-zinc-900/40 rounded-lg p-2.5 border transition-all duration-150 flex flex-col h-full max-h-full",
                isDragOver
                  ? "border-[#1f4d3d] dark:border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs"
                  : "border-stone-200/60 dark:border-zinc-800/60"
              )}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-2.5 px-1 select-none">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: column.color || '#1f4d3d' }}
                  />
                  <h3 className="text-xs font-semibold text-stone-800 dark:text-zinc-200 truncate max-w-[150px]">
                    {column.name}
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-200/80 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 font-mono font-medium">
                    {colItems.length}
                  </span>
                </div>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() =>
                      groupProp && column.id !== 'no_group'
                        ? onAddItem({ [groupProp.id]: column.id })
                        : onAddItem()
                    }
                    className="p-1 hover:bg-stone-200/70 dark:hover:bg-zinc-800 rounded text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    title="Add Item to Column"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Cards List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 no-scrollbar min-h-[40px]">
                {colItems.map((item) => (
                  <KanbanCard
                    key={item.id}
                    item={item}
                    properties={properties}
                    groupProp={groupProp}
                    options={options}
                    readOnly={readOnly}
                    onUpdateItem={onUpdateItem}
                    onDeleteItem={onDeleteItem}
                    onOpenRowDrawer={onOpenRowDrawer}
                    onDragStart={() => setDraggedItemId(item.id)}
                    onDragEnd={() => {
                      setDraggedItemId(null);
                      setDragOverColumnId(null);
                    }}
                    isBeingDragged={draggedItemId === item.id}
                  />
                ))}

                {colItems.length === 0 && (
                  <div className="py-6 text-center text-xs text-stone-400 dark:text-zinc-600 border border-dashed border-stone-200/70 dark:border-zinc-800/70 rounded-md select-none">
                    No cards in column
                  </div>
                )}
              </div>

              {/* Quick Add Button */}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() =>
                    groupProp && column.id !== 'no_group'
                      ? onAddItem({ [groupProp.id]: column.id })
                      : onAddItem()
                  }
                  className="mt-2 flex items-center justify-center gap-1.5 px-2.5 py-1 w-full rounded-md text-xs font-medium text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New card</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface KanbanCardProps {
  item: DatabaseItem;
  properties: DatabaseProperty[];
  groupProp?: DatabaseProperty;
  options: Array<{ id: string; name: string; color: string }>;
  readOnly?: boolean;
  onUpdateItem: (itemId: string, updates: { title?: string; properties?: Record<string, any> }) => void;
  onDeleteItem: (itemId: string) => void;
  onOpenRowDrawer?: (item: DatabaseItem) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isBeingDragged?: boolean;
}

function KanbanCard({
  item,
  properties,
  groupProp,
  options,
  readOnly,
  onUpdateItem,
  onDeleteItem,
  onOpenRowDrawer,
  onDragStart,
  onDragEnd,
  isBeingDragged,
}: KanbanCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(item.title || '');

  const tagProps = properties.filter((p) => p.type === 'multi_select' || p.type === 'select');
  const dateProp = properties.find((p) => p.type === 'date');
  const checkboxProps = properties.filter((p) => p.type === 'checkbox');

  return (
    <div
      draggable={!readOnly && !isEditing}
      onDragStart={(e) => {
        onDragStart();
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={onDragEnd}
      onClick={() => {
        if (!isEditing) onOpenRowDrawer?.(item);
      }}
      className={cn(
        "group bg-white dark:bg-[#18181b] rounded-md p-2.5 border border-stone-200/70 dark:border-zinc-800/70 shadow-2xs hover:border-stone-300 dark:hover:border-zinc-700 hover:shadow-xs transition-all cursor-pointer relative select-none",
        isBeingDragged ? "opacity-40 scale-95 border-dashed border-[#1f4d3d]" : ""
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        {isEditing && !readOnly ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => {
              onUpdateItem(item.id, { title: title.trim() });
              setIsEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                onUpdateItem(item.id, { title: title.trim() });
                setIsEditing(false);
              } else if (e.key === 'Escape') {
                e.stopPropagation();
                setTitle(item.title || '');
                setIsEditing(false);
              }
            }}
            className="w-full text-xs font-semibold px-1.5 py-0.5 border rounded bg-stone-50 dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 border-[#1f4d3d] focus:outline-none"
            autoFocus
          />
        ) : (
          <h4
            onClick={(e) => {
              if (!readOnly) {
                e.stopPropagation();
                setIsEditing(true);
              }
            }}
            className="text-xs font-semibold text-stone-900 dark:text-zinc-100 hover:text-[#1f4d3d] dark:hover:text-emerald-400 leading-snug break-words"
          >
            {item.title || 'Untitled'}
          </h4>
        )}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {onOpenRowDrawer && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenRowDrawer(item);
              }}
              className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
              title="Open Page"
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
              className="p-1 rounded text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Delete Card"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Property Badges & Checkboxes */}
      <div className="space-y-1.5 mt-2">
        {/* Checkbox properties */}
        {checkboxProps.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {checkboxProps.map((cp) => {
              const checked = Boolean(item.properties?.[cp.id]);
              return (
                <button
                  key={cp.id}
                  type="button"
                  disabled={readOnly}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateItem(item.id, {
                      properties: {
                        ...item.properties,
                        [cp.id]: !checked,
                      },
                    });
                  }}
                  className="flex items-center gap-1 text-[11px] text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-200 cursor-pointer"
                >
                  {checked ? (
                    <CheckSquare className="w-3.5 h-3.5 text-[#1f4d3d] dark:text-emerald-400" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-stone-400" />
                  )}
                  <span className={checked ? "line-through opacity-60" : ""}>{cp.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Tag properties */}
        {tagProps.map((prop) => {
          const val = item.properties?.[prop.id];
          if (!val) return null;

          if (prop.type === 'multi_select' && Array.isArray(val)) {
            const selectedOpts = prop.options?.filter((o) => val.includes(o.id)) || [];
            return (
              <div key={prop.id} className="flex flex-wrap gap-1">
                {selectedOpts.map((opt) => {
                  const badge = getOptionBadgeStyles(opt.color);
                  return (
                    <span
                      key={opt.id}
                      className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors", badge.className)}
                      style={badge.style}
                    >
                      {opt.name}
                    </span>
                  );
                })}
              </div>
            );
          }

          if (prop.type === 'select' && typeof val === 'string') {
            const opt = prop.options?.find((o) => o.id === val);
            if (!opt) return null;
            const badge = getOptionBadgeStyles(opt.color);
            return (
              <div key={prop.id} className="inline-block">
                <span
                  className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors", badge.className)}
                  style={badge.style}
                >
                  {opt.name}
                </span>
              </div>
            );
          }

          return null;
        })}

        {dateProp && item.properties?.[dateProp.id] && (
          <div className="flex items-center gap-1 text-[11px] text-stone-400 dark:text-zinc-500">
            <Calendar className="w-3 h-3" />
            <span>{String(item.properties[dateProp.id])}</span>
          </div>
        )}
      </div>

      {/* Move card to another column selector */}
      {!readOnly && groupProp && (
        <div className="mt-2.5 pt-2 border-t border-stone-100 dark:border-zinc-800/60 flex items-center justify-between">
          <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-medium">Column:</span>
          <select
            value={item.properties?.[groupProp.id] || ''}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              onUpdateItem(item.id, {
                properties: {
                  ...item.properties,
                  [groupProp.id]: e.target.value || null,
                },
              });
            }}
            className="text-[10px] bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-stone-700 dark:text-zinc-300 focus:outline-none"
          >
            <option value="">(None)</option>
            {options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
