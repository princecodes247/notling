import React, { useState } from 'react';
import type { DatabaseItem, DatabaseProperty } from '~/db/schema';
import { PropertyTypeIcon } from './PropertyTypeIcon';
import { X, Maximize2, Minimize2, Trash2, Calendar, FileText, ChevronRight } from 'lucide-react';

interface DatabaseRowDrawerProps {
  item: DatabaseItem;
  properties: DatabaseProperty[];
  onClose: () => void;
  onUpdateItem: (itemId: string, updates: { title?: string; properties?: Record<string, any> }) => void;
  onDeleteItem: (itemId: string) => void;
  readOnly?: boolean;
}

export function DatabaseRowDrawer({
  item,
  properties,
  onClose,
  onUpdateItem,
  onDeleteItem,
  readOnly = false,
}: DatabaseRowDrawerProps) {
  const [title, setTitle] = useState(item.title);
  const titleProp = properties.find((p) => p.type === 'title');
  const nonTitleProps = properties.filter((p) => p.type !== 'title');

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/30 dark:bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-[#18181b] h-full shadow-2xl border-l border-stone-200/80 dark:border-zinc-800/80 flex flex-col font-sans">
        {/* Drawer Header */}
        <div className="p-4 border-b border-stone-200/80 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-zinc-400">
            <FileText className="w-4 h-4 text-stone-400" />
            <span>Row Page</span>
          </div>

          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                onClick={() => {
                  onDeleteItem(item.id);
                  onClose();
                }}
                className="p-1.5 text-stone-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                title="Delete Row"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 rounded-md hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Row Title */}
          <div className="space-y-1">
            <input
              type="text"
              value={title}
              disabled={readOnly}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                if (title !== item.title) {
                  onUpdateItem(item.id, {
                    title,
                    properties: {
                      ...item.properties,
                      ...(titleProp ? { [titleProp.id]: title } : {}),
                    },
                  });
                }
              }}
              className="w-full text-2xl font-bold bg-transparent border-none focus:outline-none focus:bg-stone-50 dark:focus:bg-zinc-900/60 px-1 py-1 rounded-lg text-stone-950 dark:text-white"
              placeholder="Untitled Row"
            />
          </div>

          {/* Properties List */}
          <div className="space-y-2 border-y border-stone-200/80 dark:border-zinc-800/80 py-4">
            <h4 className="text-xs font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
              Properties
            </h4>

            {nonTitleProps.map((prop) => {
              const val = item.properties?.[prop.id];

              return (
                <div key={prop.id} className="grid grid-cols-3 gap-2 items-center text-xs py-1">
                  <div className="flex items-center gap-1.5 text-stone-500 dark:text-zinc-400">
                    <PropertyTypeIcon type={prop.type} className="w-3.5 h-3.5 text-stone-400" />
                    <span className="font-medium">{prop.name}</span>
                  </div>

                  <div className="col-span-2">
                    <DrawerPropertyValue
                      prop={prop}
                      value={val}
                      readOnly={readOnly}
                      onChange={(newVal) => {
                        onUpdateItem(item.id, {
                          properties: {
                            ...item.properties,
                            [prop.id]: newVal,
                          },
                        });
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Body Note Section */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider">
              Notes & Content
            </div>
            <div className="p-4 rounded-xl border border-stone-200/80 dark:border-zinc-800/80 bg-stone-50/50 dark:bg-zinc-900/30 text-xs text-stone-600 dark:text-zinc-400">
              {item.title ? `Add notes and description for "${item.title}"...` : 'Add row notes...'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DrawerPropertyValue({ prop, value, onChange, readOnly }: { prop: DatabaseProperty; value: any; onChange: (val: any) => void; readOnly?: boolean }) {
  switch (prop.type) {
    case 'text':
      return (
        <input
          type="text"
          defaultValue={value || ''}
          disabled={readOnly}
          onBlur={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1 text-xs border rounded-md bg-stone-50 dark:bg-zinc-900 border-stone-200 dark:border-zinc-800 text-stone-900 dark:text-zinc-100"
          placeholder="Empty"
        />
      );

    case 'number':
      return (
        <input
          type="number"
          defaultValue={value ?? ''}
          disabled={readOnly}
          onBlur={(e) => onChange(e.target.value !== '' ? Number(e.target.value) : null)}
          className="w-full px-2 py-1 text-xs border rounded-md bg-stone-50 dark:bg-zinc-900 border-stone-200 dark:border-zinc-800 text-stone-900 dark:text-zinc-100"
          placeholder="0"
        />
      );

    case 'checkbox':
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-stone-300 text-[#1f4d3d]"
        />
      );

    case 'date':
      return (
        <input
          type="date"
          defaultValue={value || ''}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className="px-2 py-1 text-xs border rounded-md bg-stone-50 dark:bg-zinc-900 border-stone-200 dark:border-zinc-800 text-stone-900 dark:text-zinc-100"
        />
      );

    case 'select':
    case 'status':
      return (
        <select
          value={value || ''}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1 text-xs border rounded-md bg-stone-50 dark:bg-zinc-900 border-stone-200 dark:border-zinc-800 text-stone-900 dark:text-zinc-100"
        >
          <option value="">Select option...</option>
          {prop.options?.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      );

    case 'multi_select': {
      const selected: string[] = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-wrap gap-1">
          {prop.options?.map((opt) => {
            const isChecked = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  if (readOnly) return;
                  const next = isChecked ? selected.filter((id) => id !== opt.id) : [...selected, opt.id];
                  onChange(next);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium ${isChecked ? 'ring-1 ring-[#1f4d3d]' : 'opacity-60'}`}
                style={{
                  backgroundColor: `${opt.color}20`,
                  color: opt.color,
                }}
              >
                {isChecked ? `✓ ${opt.name}` : opt.name}
              </button>
            );
          })}
        </div>
      );
    }

    default:
      return (
        <input
          type="text"
          defaultValue={value || ''}
          disabled={readOnly}
          onBlur={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1 text-xs border rounded-md bg-stone-50 dark:bg-zinc-900 border-stone-200 dark:border-zinc-800 text-stone-900 dark:text-zinc-100"
        />
      );
  }
}
