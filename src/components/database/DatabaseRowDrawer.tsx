import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import type { DatabaseItem, DatabaseProperty } from '~/db/schema';
import { PropertyTypeIcon } from './PropertyTypeIcon';
import { CustomDatePicker } from './CustomDatePicker';
import { validatePropertyValue, parseDateInput } from '~/lib/databaseValidation';
import { DatabasePopover } from './DatabasePopover';
import { X, Trash2, AlertCircle, Calendar as CalendarIcon, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { getOrCreateDatabaseItemPage } from '~/server/databases';
import { BlockEditorInner } from '../BlockEditorInner';
import { cn } from '#/lib/utils';
import { getOptionBadgeStyles } from '~/lib/optionColors';

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
  const navigate = useNavigate();
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState<string>(item.properties?._notes || '');
  const titleProp = properties.find((p) => p.type === 'title');
  const nonTitleProps = properties.filter((p) => p.type !== 'title');

  const { data: pageData, isLoading: isPageLoading } = useQuery({
    queryKey: ['databaseItemPage', item.id],
    queryFn: async () => {
      return await getOrCreateDatabaseItemPage({ data: item.id });
    },
    enabled: !!item.id,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-stone-900/40 dark:bg-black/60 backdrop-blur-xs cursor-pointer"
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-white dark:bg-[#18181b] h-full shadow-2xl border-l border-stone-200/80 dark:border-zinc-800/80 flex flex-col font-sans cursor-default"
      >
        {/* Drawer Header */}
        <div className="p-4 pb-0 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 dark:text-zinc-400">
          </div>

          <div className="flex items-center gap-2">
            {pageData?.id && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate({ to: '/dashboard/p/$pageId', params: { pageId: pageData.id } });
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-stone-700 dark:text-zinc-200 bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 rounded-md transition-all cursor-pointer mr-2"
                title="Open as full page"
              >
                <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
                <span>Open full page</span>
              </button>
            )}

            {!readOnly && (
              <button
                type="button"
                onClick={() => {
                  onDeleteItem(item.id);
                  onClose();
                }}
                className="p-1.5 text-stone-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 active:scale-95 transition-all cursor-pointer"
                title="Delete Row"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 rounded-md hover:bg-stone-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
              title="Close Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 pl-14 overflow-y-auto pt-2 p-6 space-y-6">
          {/* Row Title */}
          <div className="space-y-1">
            <input
              autoFocus
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
              className="w-full text-2xl font-bold bg-transparent border-none focus:outline-none px-1 py-1 rounded-lg text-stone-950 dark:text-white placeholder:text-stone-300 dark:placeholder:text-zinc-600"
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
                    <PropertyTypeIcon type={prop.type} icon={prop.icon} className="w-3.5 h-3.5 text-stone-400" />
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

          {/* Subpage Block Editor Section */}
          <div className="space-y-2 pt-2 flex-1 flex flex-col min-h-[300px]">
            <div className="text-xs font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider flex items-center justify-between">
              <span>Page Content & Blocks</span>
              <span className="text-[10px] text-stone-400 font-normal">Auto-saved</span>
            </div>
            {isPageLoading ? (
              <RowEditorSkeleton />
            ) : pageData ? (
              <div className="flex-1 min-h-[260px] overflow-hidden p-2">
                <BlockEditorInner page={pageData} readOnly={readOnly} />
              </div>
            ) : (
              <textarea
                value={notes}
                disabled={readOnly}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => {
                  if (notes !== (item.properties?._notes || '')) {
                    onUpdateItem(item.id, {
                      properties: {
                        ...item.properties,
                        _notes: notes,
                      },
                    });
                  }
                }}
                placeholder={`Add detailed notes, specifications, or description for "${title || 'this row'}"...`}
                className="w-full min-h-[220px] p-3 rounded-xl border border-stone-200/80 dark:border-zinc-800/80 bg-stone-50/50 dark:bg-zinc-900/30 text-xs text-stone-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#1f4d3d] focus:bg-white dark:focus:bg-zinc-900 transition-all resize-y font-mono leading-relaxed"
              />
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RowEditorSkeleton() {
  return (
    <div className="flex-1 min-h-[260px] p-4 space-y-4 animate-pulse">
      {/* Heading Skeleton */}
      <div className="h-5 bg-stone-200/80 dark:bg-zinc-800 rounded-md w-1/2" />

      {/* Paragraph 1 */}
      <div className="space-y-2 pt-1">
        <div className="h-3.5 bg-stone-200/70 dark:bg-zinc-800/70 rounded w-full" />
        <div className="h-3.5 bg-stone-200/70 dark:bg-zinc-800/70 rounded w-5/6" />
        <div className="h-3.5 bg-stone-200/70 dark:bg-zinc-800/70 rounded w-4/6" />
      </div>

      {/* Callout Skeleton */}
      <div className="p-3.5 rounded-lg border border-stone-200/60 dark:border-zinc-800 bg-stone-100/50 dark:bg-zinc-800/30 space-y-2">
        <div className="h-3.5 bg-stone-200 dark:bg-zinc-700 rounded w-1/3" />
        <div className="h-3 bg-stone-200/60 dark:bg-zinc-800/60 rounded w-4/5" />
      </div>

      {/* Bullet Items Skeleton */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-zinc-700 shrink-0" />
          <div className="h-3.5 bg-stone-200/70 dark:bg-zinc-800/70 rounded w-1/2" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-zinc-700 shrink-0" />
          <div className="h-3.5 bg-stone-200/70 dark:bg-zinc-800/70 rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}

function DrawerPropertyValue({ prop, value, onChange, readOnly }: { prop: DatabaseProperty; value: any; onChange: (val: any) => void; readOnly?: boolean }) {
  const [isDateOpen, setIsDateOpen] = useState(false);
  const dateTriggerRef = useRef<HTMLButtonElement>(null);
  const [inputVal, setInputVal] = useState(value !== undefined && value !== null ? String(value) : '');

  // Validation
  const validation = validatePropertyValue(prop.type, value);

  switch (prop.type) {
    case 'text':
      return (
        <input
          type="text"
          defaultValue={value || ''}
          disabled={readOnly}
          onBlur={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1 text-xs border rounded-md bg-stone-50 dark:bg-zinc-900 border-stone-200 dark:border-zinc-800 text-stone-900 dark:text-zinc-100 focus:ring-1 focus:ring-[#1f4d3d] placeholder:text-stone-300 dark:placeholder:text-zinc-600 placeholder:italic"
          placeholder="Empty"
        />
      );

    case 'number': {
      const isInvalid = !validation.isValid;
      return (
        <div className="space-y-1">
          <input
            type="number"
            value={inputVal}
            disabled={readOnly}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={() => {
              const numVal = inputVal !== '' ? Number(inputVal) : null;
              onChange(numVal);
            }}
            className={`w-full px-2 py-1 text-xs border rounded-md bg-stone-50 dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 font-mono placeholder:text-stone-300 dark:placeholder:text-zinc-600 ${isInvalid ? 'border-rose-500 ring-1 ring-rose-500' : 'border-stone-200 dark:border-zinc-800 focus:ring-1 focus:ring-[#1f4d3d]'
              }`}
            placeholder="0"
          />
          {isInvalid && (
            <div className="flex items-center gap-1 text-[10px] text-rose-500 font-medium">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{validation.errorMessage}</span>
            </div>
          )}
        </div>
      );
    }

    case 'url': {
      const isInvalid = !validation.isValid;
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <input
              type="url"
              value={inputVal}
              disabled={readOnly}
              onChange={(e) => setInputVal(e.target.value)}
              onBlur={() => onChange(inputVal)}
              className={`w-full px-2 py-1 text-xs border rounded-md bg-stone-50 dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 ${isInvalid ? 'border-rose-500 ring-1 ring-rose-500' : 'border-stone-200 dark:border-zinc-800 focus:ring-1 focus:ring-[#1f4d3d]'
                }`}
              placeholder="https://..."
            />
            {value && !isInvalid && (
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="p-1 text-[#1f4d3d] dark:text-emerald-400 hover:opacity-80 shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          {isInvalid && (
            <div className="flex items-center gap-1 text-[10px] text-rose-500 font-medium">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{validation.errorMessage}</span>
            </div>
          )}
        </div>
      );
    }

    case 'email': {
      const isInvalid = !validation.isValid;
      return (
        <div className="space-y-1">
          <input
            type="email"
            value={inputVal}
            disabled={readOnly}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={() => onChange(inputVal)}
            className={`w-full px-2 py-1 text-xs border rounded-md bg-stone-50 dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 ${isInvalid ? 'border-rose-500 ring-1 ring-rose-500' : 'border-stone-200 dark:border-zinc-800 focus:ring-1 focus:ring-[#1f4d3d]'
              }`}
            placeholder="name@domain.com"
          />
          {isInvalid && (
            <div className="flex items-center gap-1 text-[10px] text-rose-500 font-medium">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{validation.errorMessage}</span>
            </div>
          )}
        </div>
      );
    }

    case 'checkbox':
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.checked)}
          className="bn-checkbox w-4 h-4 cursor-pointer"
        />
      );

    case 'date': {
      const isInvalid = !validation.isValid;
      return (
        <div className="relative space-y-1">
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={inputVal}
              disabled={readOnly}
              onChange={(e) => setInputVal(e.target.value)}
              onBlur={() => {
                const parsed = parseDateInput(inputVal);
                if (parsed !== null) {
                  setInputVal(parsed);
                  onChange(parsed);
                } else {
                  onChange(inputVal);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const parsed = parseDateInput(inputVal);
                  if (parsed !== null) {
                    setInputVal(parsed);
                    onChange(parsed);
                  } else {
                    onChange(inputVal);
                  }
                }
              }}
              className={`w-full px-2 py-1 text-xs border rounded-md bg-stone-50 dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 ${isInvalid ? 'border-rose-500 ring-1 ring-rose-500' : 'border-stone-200 dark:border-zinc-800 focus:ring-1 focus:ring-[#1f4d3d]'
                }`}
              placeholder="YYYY-MM-DD or today..."
            />
            <button
              ref={dateTriggerRef}
              type="button"
              disabled={readOnly}
              onClick={() => setIsDateOpen(!isDateOpen)}
              className="p-1.5 rounded-md border border-stone-200 dark:border-zinc-800 hover:bg-stone-100 dark:hover:bg-zinc-800 text-[#1f4d3d] dark:text-emerald-400 cursor-pointer shrink-0"
              title="Open Calendar Picker"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {isInvalid && (
            <div className="flex items-center gap-1 text-[10px] text-rose-500 font-medium">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{validation.errorMessage}</span>
            </div>
          )}

          <DatabasePopover
            isOpen={isDateOpen}
            onClose={() => setIsDateOpen(false)}
            triggerRef={dateTriggerRef}
            width={270}
          >
            <CustomDatePicker
              value={value}
              onChange={(d) => {
                setInputVal(d);
                onChange(d);
                setIsDateOpen(false);
              }}
              onClose={() => setIsDateOpen(false)}
              readOnly={readOnly}
            />
          </DatabasePopover>
        </div>
      );
    }

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
            const badge = getOptionBadgeStyles(opt.color);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  if (readOnly) return;
                  const next = isChecked ? selected.filter((id) => id !== opt.id) : [...selected, opt.id];
                  onChange(next);
                }}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer",
                  isChecked ? "ring-2 ring-[#1f4d3d] dark:ring-emerald-400 font-semibold" : "opacity-60 hover:opacity-100",
                  badge.className
                )}
                style={badge.style}
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
