import React, { useState } from 'react';
import type { DatabaseProperty, DatabaseItem } from '~/db/schema';
import { Plus, Trash2, Tag, Calendar, MoreHorizontal, CheckCircle2 } from 'lucide-react';

interface DatabaseBoardViewProps {
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  groupByPropertyId?: string;
  onUpdateItem: (itemId: string, updates: { title?: string; properties?: Record<string, any> }) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (initialProperties?: Record<string, any>) => void;
  readOnly?: boolean;
}

export function DatabaseBoardView({
  properties,
  items,
  groupByPropertyId,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  readOnly = false,
}: DatabaseBoardViewProps) {
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

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {columns.map((column) => {
          const colItems = groupedItemsMap[column.id] || [];

          return (
            <div
              key={column.id}
              className="w-72 shrink-0 bg-neutral-100/70 dark:bg-neutral-900/60 rounded-xl p-3 border border-neutral-200/80 dark:border-neutral-800 flex flex-col max-h-[75vh]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: column.color || '#3b82f6' }}
                  />
                  <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    {column.name}
                  </h3>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                    {colItems.length}
                  </span>
                </div>

                {!readOnly && (
                  <button
                    onClick={() =>
                      groupProp && column.id !== 'no_group'
                        ? onAddItem({ [groupProp.id]: column.id })
                        : onAddItem()
                    }
                    className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                    title="Add Item to Column"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Cards List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
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
                  />
                ))}

                {colItems.length === 0 && (
                  <div className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-600 border-2 border-dashed border-neutral-200 dark:border-neutral-800/80 rounded-lg">
                    No items
                  </div>
                )}
              </div>

              {/* Quick Add Button */}
              {!readOnly && (
                <button
                  onClick={() =>
                    groupProp && column.id !== 'no_group'
                      ? onAddItem({ [groupProp.id]: column.id })
                      : onAddItem()
                  }
                  className="mt-3 flex items-center gap-1.5 px-3 py-2 w-full rounded-lg text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors"
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
}

function KanbanCard({
  item,
  properties,
  groupProp,
  options,
  readOnly,
  onUpdateItem,
  onDeleteItem,
}: KanbanCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(item.title);

  // Pick non-group properties to render badges on the card
  const tagProps = properties.filter((p) => p.type === 'multi_select' || p.type === 'select');
  const dateProp = properties.find((p) => p.type === 'date');

  return (
    <div className="group bg-white dark:bg-neutral-800 rounded-lg p-3 border border-neutral-200 dark:border-neutral-700/80 shadow-xs hover:shadow-md transition-shadow relative">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        {isEditing && !readOnly ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              onUpdateItem(item.id, { title });
              setIsEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onUpdateItem(item.id, { title });
                setIsEditing(false);
              }
            }}
            className="w-full text-xs font-semibold px-1 py-0.5 border rounded bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border-blue-500 focus:outline-none"
            autoFocus
          />
        ) : (
          <h4
            onClick={() => !readOnly && setIsEditing(true)}
            className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 leading-snug"
          >
            {item.title || 'Untitled'}
          </h4>
        )}

        {!readOnly && (
          <button
            onClick={() => onDeleteItem(item.id)}
            className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-opacity"
            title="Delete Card"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Property Badges & Tags */}
      <div className="space-y-1.5 mt-2">
        {tagProps.map((prop) => {
          const val = item.properties?.[prop.id];
          if (!val) return null;

          if (prop.type === 'multi_select' && Array.isArray(val)) {
            const selectedOpts = prop.options?.filter((o) => val.includes(o.id)) || [];
            return (
              <div key={prop.id} className="flex flex-wrap gap-1">
                {selectedOpts.map((opt) => (
                  <span
                    key={opt.id}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{
                      backgroundColor: `${opt.color}20`,
                      color: opt.color,
                      border: `1px solid ${opt.color}35`,
                    }}
                  >
                    {opt.name}
                  </span>
                ))}
              </div>
            );
          }

          if (prop.type === 'select' && typeof val === 'string') {
            const opt = prop.options?.find((o) => o.id === val);
            if (!opt) return null;
            return (
              <div key={prop.id} className="inline-block">
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: `${opt.color}20`,
                    color: opt.color,
                    border: `1px solid ${opt.color}35`,
                  }}
                >
                  {opt.name}
                </span>
              </div>
            );
          }

          return null;
        })}

        {dateProp && item.properties?.[dateProp.id] && (
          <div className="flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500">
            <Calendar className="w-3 h-3" />
            <span>{String(item.properties[dateProp.id])}</span>
          </div>
        )}
      </div>

      {/* Move card to another column selector */}
      {!readOnly && groupProp && (
        <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between">
          <span className="text-[10px] text-neutral-400 font-medium">Status:</span>
          <select
            value={item.properties?.[groupProp.id] || ''}
            onChange={(e) => {
              onUpdateItem(item.id, {
                properties: {
                  ...item.properties,
                  [groupProp.id]: e.target.value,
                },
              });
            }}
            className="text-[10px] bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 text-neutral-700 dark:text-neutral-300 focus:outline-none"
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
