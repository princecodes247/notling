import React, { useRef, useState, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { DatabaseProperty, RelationConfig } from '~/db/schema';
import { RelationPickerPopover } from './RelationPickerPopover';
import { FileText, X } from 'lucide-react';

interface RelationCellProps {
  prop: DatabaseProperty;
  value: any;
  onChange: (val: string[]) => void;
  relatedItemsLookup?: Record<string, { id: string; databaseId: string; title: string; pageId?: string | null }>;
  readOnly?: boolean;
  isEditing?: boolean;
  onSelectCell?: () => void;
  onNavigate?: (reverse?: boolean) => void;
  onItemCreated?: (item: { id: string; title: string; pageId?: string | null; databaseId: string }) => void;
  onOpenRowDrawer?: (item: any) => void;
}

export function RelationCell({
  prop,
  value,
  onChange,
  relatedItemsLookup = {},
  readOnly = false,
  onSelectCell,
  onNavigate,
  onItemCreated,
  onOpenRowDrawer,
}: RelationCellProps) {
  const navigate = useNavigate();
  const triggerRef = useRef<HTMLDivElement>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [localLookup, setLocalLookup] = useState<Record<string, { id: string; databaseId: string; title: string; pageId?: string | null }>>({});

  const mergedLookup = useMemo(() => {
    return { ...relatedItemsLookup, ...localLookup };
  }, [relatedItemsLookup, localLookup]);

  const handleItemCreated = (item: { id: string; title: string; pageId?: string | null; databaseId: string }) => {
    setLocalLookup((prev) => ({
      ...prev,
      [item.id]: item,
    }));
    onItemCreated?.(item);
  };

  const config = (prop.config as RelationConfig) || {};
  const targetDatabaseId = config.targetDatabaseId || '';
  const limit = config.limit || 'multiple';

  const selectedIds: string[] = useMemo(() => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) return [value.trim()];
    return [];
  }, [value]);

  const handleOpenItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const itemMeta = mergedLookup[id];
    if (itemMeta?.pageId) {
      navigate({ to: '/dashboard/p/$pageId', params: { pageId: itemMeta.pageId } });
    } else if (onOpenRowDrawer) {
      onOpenRowDrawer({ id, databaseId: itemMeta?.databaseId || targetDatabaseId, title: itemMeta?.title || 'Untitled' });
    }
  };

  const handleRemoveItem = (e: React.MouseEvent, idToRemove: string) => {
    e.stopPropagation();
    if (readOnly) return;
    const next = selectedIds.filter((id) => id !== idToRemove);
    onChange(next);
  };

  return (
    <div className="relative w-full" ref={triggerRef}>
      <div
        tabIndex={0}
        onClick={(e) => {
          if (readOnly) return;
          e.stopPropagation();
          if (onSelectCell) onSelectCell();
          setIsPopoverOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            if (!readOnly) setIsPopoverOpen(true);
          } else if (e.key === 'Tab') {
            if (onNavigate) {
              e.preventDefault();
              e.stopPropagation();
              onNavigate(e.shiftKey);
            }
          } else if (e.key === 'Escape') {
            setIsPopoverOpen(false);
          }
        }}
        className="flex flex-wrap gap-1 items-center px-1.5 py-1 min-h-6.5 cursor-pointer rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-[#1f4d3d]/30"
      >
        {selectedIds.length > 0 ? (
          selectedIds.map((id) => {
            const meta = mergedLookup[id];
            const title = meta?.title || 'Untitled';

            return (
              <span
                key={id}
                onClick={(e) => handleOpenItem(e, id)}
                className="group/relation inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 hover:bg-stone-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-stone-800 dark:text-zinc-200 border border-stone-200/70 dark:border-zinc-700/70 transition-all cursor-pointer shadow-2xs select-none"
                title={`Open "${title}"`}
              >
                <FileText className="w-3 h-3 opacity-60 text-stone-500 shrink-0" />
                <span className="truncate max-w-[140px] hover:underline">
                  {title}
                </span>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveItem(e, id)}
                    className="opacity-40 group-hover/relation:opacity-100 hover:bg-stone-300 dark:hover:bg-zinc-600 rounded p-0.5 transition-opacity cursor-pointer shrink-0"
                    title="Unlink record"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            );
          })
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-normal text-stone-300 dark:text-zinc-600 italic select-none">
            <span>Empty</span>
          </span>
        )}
      </div>

      {isPopoverOpen && targetDatabaseId && (
        <RelationPickerPopover
          isOpen={isPopoverOpen}
          onClose={() => setIsPopoverOpen(false)}
          triggerRef={triggerRef}
          targetDatabaseId={targetDatabaseId}
          selectedIds={selectedIds}
          limit={limit}
          onChange={(next) => {
            onChange(next);
            if (limit === 'single') setIsPopoverOpen(false);
          }}
          onItemCreated={handleItemCreated}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
