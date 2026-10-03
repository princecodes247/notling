import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { DatabaseProperty, DatabaseItem } from '~/db/schema';
import { PropertyTypeIcon } from './PropertyTypeIcon';
import { DatabasePopover } from './DatabasePopover';
import { CustomDatePicker } from './CustomDatePicker';
import { validatePropertyValue, parseDateInput } from '~/lib/databaseValidation';
import {
  Plus,
  Trash2,
  MoreHorizontal,
  ExternalLink,
  Check,
  Calendar,
  Maximize2,
  GripVertical,
  Palette,
  Search,
  Edit2,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Upload,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '#/lib/utils';
import { useDragPaint } from '~/hooks/useDragPaint';
import { AnimatePresence } from 'motion/react';

interface DatabaseTableViewProps {
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  totalCount?: number;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  isSearching?: boolean;
  sortBy?: { propertyId: string; direction: 'asc' | 'desc' } | null;
  onSortChange?: (sortBy: { propertyId: string; direction: 'asc' | 'desc' } | null) => void;
  onFetchNextPage?: () => void;
  onUpdateItem: (itemId: string, updates: { title?: string; properties?: Record<string, any> }) => void;
  onDeleteItem: (itemId: string) => void;
  onDeleteItemsBulk?: (itemIds: string[]) => void;
  onReorderItems?: (fromIndex: number, toIndex: number) => void;
  onAddItem: () => void;
  onAddProperty: (name: string, type: string) => void;
  onDeleteProperty: (propertyId: string) => void;
  onConvertPropertyType?: (propertyId: string, newType: string) => void;
  onUpdateProperty?: (propertyId: string, updates: Partial<DatabaseProperty>) => void;
  onOpenRowDrawer?: (item: DatabaseItem) => void;
  onImportData?: () => void;
  readOnly?: boolean;
}

const PROPERTY_TYPES = [
  { type: 'text', label: 'Text' },
  { type: 'number', label: 'Number' },
  { type: 'status', label: 'Status' },
  { type: 'select', label: 'Select' },
  { type: 'multi_select', label: 'Multi-select' },
  { type: 'date', label: 'Date' },
  { type: 'checkbox', label: 'Checkbox' },
  { type: 'url', label: 'URL' },
  { type: 'email', label: 'Email' },
];

import {
  APPLE_COLORS,
  AUTO_COLORS,
  getOptionBadgeStyles,
} from '~/lib/optionColors';

export function DatabaseTableView({
  properties,
  items,
  totalCount,
  hasNextPage,
  isFetchingNextPage,
  isSearching,
  sortBy,
  onSortChange,
  onFetchNextPage,
  onUpdateItem,
  onDeleteItem: _onDeleteItem,
  onDeleteItemsBulk,
  onReorderItems,
  onAddItem,
  onAddProperty,
  onDeleteProperty,
  onConvertPropertyType,
  onUpdateProperty,
  onOpenRowDrawer,
  onImportData,
  readOnly = false,
}: DatabaseTableViewProps) {
  // Table virtual scroll container ref
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Sorting helper
  const handleToggleSort = useCallback(
    (propId: string) => {
      if (!onSortChange) return;
      if (!sortBy || sortBy.propertyId !== propId) {
        onSortChange({ propertyId: propId, direction: 'asc' });
      } else if (sortBy.direction === 'asc') {
        onSortChange({ propertyId: propId, direction: 'desc' });
      } else {
        onSortChange(null);
      }
    },
    [onSortChange, sortBy]
  );

  // Fast O(1) map for item lookups
  const itemsMapRef = useRef<Map<string, DatabaseItem>>(new Map());
  useEffect(() => {
    const map = new Map<string, DatabaseItem>();
    for (let i = 0; i < items.length; i++) {
      map.set(items[i].id, items[i]);
    }
    itemsMapRef.current = map;
  }, [items]);

  // Unified State-Aware Menu ID
  const [activeOpenMenuId, setActiveOpenMenuId] = useState<string | null>(null);

  // Column Header Rename State
  const [editingHeaderId, setEditingHeaderId] = useState<string | null>(null);
  const [headerTitle, setHeaderTitle] = useState('');

  // Column Delete Confirmation Dialog
  const [deleteConfirmProp, setDeleteConfirmProp] = useState<{ id: string; name: string; count: number } | null>(null);

  // Property Type Conversion Preview Dialog
  const [conversionPreview, setConversionPreview] = useState<{
    propId: string;
    propName: string;
    targetType: string;
    total: number;
    convertible: number;
    lossy: number;
  } | null>(null);

  // Bulk Row Selection State
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const selectedItemIdsSet = useRef<Set<string>>(new Set());
  selectedItemIdsSet.current = new Set(selectedItemIds);

  // Shared Paint Hook for Row Selection Checkboxes
  const rowPaint = useDragPaint<string>({
    mode: 'invert',
    onPaintItem: (id, targetState) => {
      setSelectedItemIds((prev) =>
        targetState ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((item) => item !== id)
      );
    },
    getItemState: (id) => selectedItemIdsSet.current.has(id),
  });

  // Shared Paint Hook for Property Checkbox Cells (O(1) lookup via itemsMapRef)
  const propertyPaint = useDragPaint<{ itemId: string; propId: string }>({
    mode: 'invert',
    onPaintItem: ({ itemId, propId }, targetState) => {
      const targetItem = itemsMapRef.current.get(itemId);
      onUpdateItem(itemId, {
        properties: {
          ...targetItem?.properties,
          [propId]: targetState,
        },
      });
    },
    getItemState: ({ itemId, propId }) => {
      const targetItem = itemsMapRef.current.get(itemId);
      return Boolean(targetItem?.properties?.[propId]);
    },
  });

  const handlePropertyCheckboxMouseDown = useCallback((itemId: string, propId: string, currentVal: boolean, e: React.MouseEvent) => {
    propertyPaint.startPaint({ itemId, propId }, currentVal, e);
  }, [propertyPaint]);

  const handlePropertyCheckboxMouseEnter = useCallback((itemId: string, propId: string) => {
    propertyPaint.paintItem({ itemId, propId });
  }, [propertyPaint]);

  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  const [isEditingCell, setIsEditingCell] = useState(false);

  const titleInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const shouldFocusNewRowRef = useRef<boolean>(false);
  const prevItemsLengthRef = useRef<number>(items.length);

  const titleProp = properties.find((p) => p.type === 'title');
  const nonTitleProps = properties.filter((p) => p.type !== 'title');

  // TanStack Row Virtualizer for instant 60-120 FPS rendering
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 46,
    overscan: 10,
  });

  // Track last requested count to prevent infinite scroll loops
  const lastRequestedCountRef = useRef<number>(0);

  const virtualItems = rowVirtualizer.getVirtualItems();
  const lastVirtualItemIndex = virtualItems.length > 0 ? virtualItems[virtualItems.length - 1].index : -1;

  useEffect(() => {
    // Reset requested tracker if item count resets (e.g. searching or sorting)
    if (items.length < lastRequestedCountRef.current) {
      lastRequestedCountRef.current = 0;
    }
  }, [items.length]);

  // Virtualizer-based pre-fetch trigger (triggers 15 items before end)
  useEffect(() => {
    if (lastVirtualItemIndex < 0 || items.length === 0) return;
    if (
      lastVirtualItemIndex >= items.length - 15 &&
      hasNextPage &&
      !isFetchingNextPage &&
      onFetchNextPage &&
      items.length > lastRequestedCountRef.current
    ) {
      lastRequestedCountRef.current = items.length;
      onFetchNextPage();
    }
  }, [lastVirtualItemIndex, items.length, hasNextPage, isFetchingNextPage, onFetchNextPage]);

  // Scroll depth-based proactive pre-fetch trigger (triggers at 88% scroll depth)
  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (
        hasNextPage &&
        !isFetchingNextPage &&
        onFetchNextPage &&
        items.length > lastRequestedCountRef.current
      ) {
        const { scrollTop, scrollHeight, clientHeight } = el;
        if (scrollTop + clientHeight >= scrollHeight * 0.88) {
          lastRequestedCountRef.current = items.length;
          onFetchNextPage();
        }
      }
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, onFetchNextPage, items.length]);

  const handleAddNewRow = useCallback(() => {
    shouldFocusNewRowRef.current = true;
    const newRowIndex = items.length;
    setFocusedCell({ rowIndex: newRowIndex, colIndex: 0 });
    setIsEditingCell(true);
    onAddItem();
    // Scroll to bottom
    setTimeout(() => {
      rowVirtualizer.scrollToIndex(newRowIndex, { align: 'end' });
    }, 0);
  }, [items.length, onAddItem, rowVirtualizer]);

  const handleEnterCell = useCallback((rIndex: number, cIndex: number) => {
    if (rIndex === items.length - 1) {
      handleAddNewRow();
    } else {
      setFocusedCell({ rowIndex: rIndex + 1, colIndex: cIndex });
      setIsEditingCell(true);
      rowVirtualizer.scrollToIndex(rIndex + 1, { align: 'auto' });
    }
  }, [handleAddNewRow, items.length, rowVirtualizer]);

  // Only focus cell if user is actively editing inside table AND not typing in search or outer inputs
  useEffect(() => {
    if (focusedCell && focusedCell.colIndex === 0 && (isEditingCell || shouldFocusNewRowRef.current)) {
      const activeEl = document.activeElement;
      if (activeEl && tableContainerRef.current && !tableContainerRef.current.contains(activeEl)) {
        return;
      }
      const targetItem = items[focusedCell.rowIndex];
      if (targetItem) {
        const el = titleInputRefs.current.get(targetItem.id);
        if (el && document.activeElement !== el) {
          el.focus();
          if ('select' in el && typeof el.select === 'function') {
            el.select();
          }
        }
      }
    }
  }, [focusedCell, isEditingCell, items]);

  // ONLY auto-focus new row when user explicitly clicks "New row" (shouldFocusNewRowRef)
  useEffect(() => {
    if (!readOnly && shouldFocusNewRowRef.current) {
      const newRowIndex = items.length - 1;
      if (newRowIndex >= 0) {
        setFocusedCell({ rowIndex: newRowIndex, colIndex: 0 });
        setIsEditingCell(true);
        rowVirtualizer.scrollToIndex(newRowIndex, { align: 'end' });
        const lastItem = items[newRowIndex];
        if (lastItem) {
          const el = titleInputRefs.current.get(lastItem.id);
          if (el) {
            el.focus();
            el.select();
          }
        }
      }
      shouldFocusNewRowRef.current = false;
    }
    prevItemsLengthRef.current = items.length;
  }, [items, readOnly, rowVirtualizer]);

  const handleNavigateCell = useCallback((rIndex: number, cIndex: number, shift: boolean = false) => {
    const totalCols = nonTitleProps.length + 1;
    if (!shift) {
      if (cIndex < totalCols) {
        setFocusedCell({ rowIndex: rIndex, colIndex: cIndex });
        setIsEditingCell(false);
        rowVirtualizer.scrollToIndex(rIndex, { align: 'auto' });
      } else if (rIndex < items.length - 1) {
        setFocusedCell({ rowIndex: rIndex + 1, colIndex: 0 });
        setIsEditingCell(false);
        rowVirtualizer.scrollToIndex(rIndex + 1, { align: 'auto' });
      } else {
        handleAddNewRow();
      }
    } else {
      if (cIndex > 0) {
        setFocusedCell({ rowIndex: rIndex, colIndex: cIndex - 1 });
        setIsEditingCell(false);
        rowVirtualizer.scrollToIndex(rIndex, { align: 'auto' });
      } else if (rIndex > 0) {
        setFocusedCell({ rowIndex: rIndex - 1, colIndex: totalCols - 1 });
        setIsEditingCell(false);
        rowVirtualizer.scrollToIndex(rIndex - 1, { align: 'auto' });
      }
    }
  }, [handleAddNewRow, items.length, nonTitleProps.length, rowVirtualizer]);

  type TableUndoAction =
    | {
      type: 'UPDATE_CELL';
      payload: {
        itemId: string;
        propId: string;
        previousValue: any;
      };
    }
    | {
      type: 'UPDATE_TITLE';
      payload: {
        itemId: string;
        previousTitle: string;
        titlePropId?: string;
      };
    };

  const MAX_UNDO_STACK_SIZE = 50;

  // Client-Side Lightweight Undo Stack (Cmd+Z)
  const [undoStack, setUndoStack] = useState<TableUndoAction[]>([]);

  // Column Width Resizing State
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  // Row Drag Reordering State
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);

  const handleResizeStart = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[colId] || (colId === 'title' ? 240 : 180);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(90, startWidth + deltaX);
      setColumnWidths((prev) => ({ ...prev, [colId]: newWidth }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Handle Apple Grid Keyboard Navigation (Arrow Keys, Tab, Enter, Escape)
  useEffect(() => {
    const handleTableKeyDown = (e: KeyboardEvent) => {
      if (activeOpenMenuId || editingHeaderId) return;

      const activeTag = (e.target as HTMLElement)?.tagName;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag) && document.activeElement === e.target;

      if (!focusedCell) return;

      const numRows = items.length;
      const numCols = nonTitleProps.length + 1;

      if (e.key === 'ArrowDown' && !isInput) {
        e.preventDefault();
        const nextRow = Math.min(numRows - 1, focusedCell.rowIndex + 1);
        setFocusedCell({ ...focusedCell, rowIndex: nextRow });
        setIsEditingCell(false);
        rowVirtualizer.scrollToIndex(nextRow, { align: 'auto' });
      } else if (e.key === 'ArrowUp' && !isInput) {
        e.preventDefault();
        const prevRow = Math.max(0, focusedCell.rowIndex - 1);
        setFocusedCell({ ...focusedCell, rowIndex: prevRow });
        setIsEditingCell(false);
        rowVirtualizer.scrollToIndex(prevRow, { align: 'auto' });
      } else if (e.key === 'ArrowRight' && !isInput) {
        e.preventDefault();
        const nextCol = Math.min(numCols - 1, focusedCell.colIndex + 1);
        setFocusedCell({ ...focusedCell, colIndex: nextCol });
        setIsEditingCell(false);
        rowVirtualizer.scrollToIndex(focusedCell.rowIndex, { align: 'auto' });
      } else if (e.key === 'ArrowLeft' && !isInput) {
        e.preventDefault();
        const prevCol = Math.max(0, focusedCell.colIndex - 1);
        setFocusedCell({ ...focusedCell, colIndex: prevCol });
        setIsEditingCell(false);
        rowVirtualizer.scrollToIndex(focusedCell.rowIndex, { align: 'auto' });
      } else if (e.key === 'Enter' && !isInput) {
        e.preventDefault();
        setIsEditingCell(true);
        rowVirtualizer.scrollToIndex(focusedCell.rowIndex, { align: 'auto' });
        const focusedProp = nonTitleProps[focusedCell.colIndex - 1];
        if (focusedProp && (focusedProp.type === 'select' || focusedProp.type === 'status' || focusedProp.type === 'multi_select' || focusedProp.type === 'date')) {
          const item = items[focusedCell.rowIndex];
          if (item) {
            const cellMenuId = `cell-${item.id}-${focusedProp.id}`;
            setActiveOpenMenuId(cellMenuId);
          }
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          if (focusedCell.colIndex > 0) {
            setFocusedCell({ ...focusedCell, colIndex: focusedCell.colIndex - 1 });
            setIsEditingCell(false);
            rowVirtualizer.scrollToIndex(focusedCell.rowIndex, { align: 'auto' });
          } else if (focusedCell.rowIndex > 0) {
            const prevRow = focusedCell.rowIndex - 1;
            setFocusedCell({ rowIndex: prevRow, colIndex: numCols - 1 });
            setIsEditingCell(false);
            rowVirtualizer.scrollToIndex(prevRow, { align: 'auto' });
          }
        } else {
          if (focusedCell.colIndex < numCols - 1) {
            setFocusedCell({ ...focusedCell, colIndex: focusedCell.colIndex + 1 });
            setIsEditingCell(false);
            rowVirtualizer.scrollToIndex(focusedCell.rowIndex, { align: 'auto' });
          } else if (focusedCell.rowIndex < numRows - 1) {
            const nextRow = focusedCell.rowIndex + 1;
            setFocusedCell({ rowIndex: nextRow, colIndex: 0 });
            setIsEditingCell(false);
            rowVirtualizer.scrollToIndex(nextRow, { align: 'auto' });
          }
        }
      } else if (e.key === 'Escape' && !isInput && !isEditingCell) {
        e.preventDefault();
        setFocusedCell(null);
        setIsEditingCell(false);
      }
    };

    window.addEventListener('keydown', handleTableKeyDown);
    return () => window.removeEventListener('keydown', handleTableKeyDown);
  }, [focusedCell, items, nonTitleProps, activeOpenMenuId, editingHeaderId, rowVirtualizer]);

  // Click Outside Table Cells to Deselect
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('td') && !target.closest('th') && !target.closest('[data-popover]')) {
        setFocusedCell(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Cmd+Z Undo (Lightweight delta rollback)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (undoStack.length > 0) {
          e.preventDefault();
          const lastAction = undoStack[undoStack.length - 1];
          setUndoStack((prev) => prev.slice(0, -1));

          if (lastAction.type === 'UPDATE_CELL') {
            const currentItem = items.find((i) => i.id === lastAction.payload.itemId);
            if (currentItem) {
              onUpdateItem(lastAction.payload.itemId, {
                properties: {
                  ...currentItem.properties,
                  [lastAction.payload.propId]: lastAction.payload.previousValue,
                },
              });
            }
          } else if (lastAction.type === 'UPDATE_TITLE') {
            const currentItem = items.find((i) => i.id === lastAction.payload.itemId);
            if (currentItem) {
              onUpdateItem(lastAction.payload.itemId, {
                title: lastAction.payload.previousTitle,
                properties: {
                  ...currentItem.properties,
                  ...(lastAction.payload.titlePropId ? { [lastAction.payload.titlePropId]: lastAction.payload.previousTitle } : {}),
                },
              });
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, onUpdateItem, items]);

  // Handle Column Deletion with smart data detection
  const handleRequestDeleteProperty = (prop: DatabaseProperty) => {
    const nonCount = items.filter((item) => {
      const v = item.properties?.[prop.id];
      return v !== undefined && v !== null && v !== '' && (!Array.isArray(v) || v.length > 0);
    }).length;

    if (nonCount > 0) {
      setDeleteConfirmProp({ id: prop.id, name: prop.name, count: nonCount });
    } else {
      onDeleteProperty(prop.id);
    }
    setActiveOpenMenuId(null);
  };

  // Handle Property Type Conversion Preview
  const handleRequestConvertType = (prop: DatabaseProperty, targetType: string) => {
    setActiveOpenMenuId(null);
    if (prop.type === targetType) return;

    // Lossless conversions
    const isLossless =
      (prop.type === 'text' && targetType === 'select') ||
      (prop.type === 'select' && targetType === 'text') ||
      (prop.type === 'text' && targetType === 'multi_select') ||
      (prop.type === 'number' && targetType === 'text');

    if (isLossless) {
      if (onConvertPropertyType) onConvertPropertyType(prop.id, targetType);
      return;
    }

    // Evaluate lossy conversion statistics
    let convertible = 0;
    let lossy = 0;

    items.forEach((item) => {
      const v = item.properties?.[prop.id];
      if (v === undefined || v === null || v === '') return;

      if (targetType === 'number') {
        if (!isNaN(Number(v))) convertible++;
        else lossy++;
      } else {
        convertible++;
      }
    });

    if (lossy > 0) {
      setConversionPreview({
        propId: prop.id,
        propName: prop.name,
        targetType,
        total: items.length,
        convertible,
        lossy,
      });
    } else {
      if (onConvertPropertyType) onConvertPropertyType(prop.id, targetType);
    }
  };

  // Select all rows checkbox toggle
  const handleToggleSelectAll = () => {
    if (selectedItemIds.length === items.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(items.map((i) => i.id));
    }
  };

  const handleBulkDelete = () => {
    if (onDeleteItemsBulk && selectedItemIds.length > 0) {
      onDeleteItemsBulk(selectedItemIds);
      setSelectedItemIds([]);
    }
  };

  // Active Row Title Editing State
  const [editingRowTitleId, setEditingRowTitleId] = useState<string | null>(null);

  // Virtualizer row geometry
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalVirtualSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom = virtualRows.length > 0 ? totalVirtualSize - (virtualRows[virtualRows.length - 1]?.end || 0) : 0;
  const totalColSpan = !readOnly ? nonTitleProps.length + 3 : nonTitleProps.length + 1;

  return (
    <div className="w-full font-sans relative">
      {/* Floating Action Bar for Bulk Selection (Overlayed to avoid table jumping) */}
      <AnimatePresence>
        {!readOnly && selectedItemIds.length > 0 && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-sm bg-stone-900/90 dark:bg-zinc-800/95 text-white backdrop-blur-md shadow-xl border border-stone-700/50 dark:border-zinc-700/50 text-xs animate-in fade-in slide-in-from-top-2 duration-150 select-none">
            <span className="font-medium text-stone-200">
              <strong className="text-white font-semibold">{selectedItemIds.length}</strong> row{selectedItemIds.length > 1 ? 's' : ''} selected
            </span>

            <div className="h-3.5 w-px bg-stone-700 dark:bg-zinc-700" />

            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            <button
              onClick={() => setSelectedItemIds([])}
              className="text-xs text-stone-400 hover:text-white transition-colors cursor-pointer px-1"
            >
              Cancel
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* Search Loading Bar */}
      {isSearching && (
        <div className="w-full h-0.5 bg-[#1f4d3d]/20 dark:bg-emerald-500/20 overflow-hidden relative">
          <div className="absolute top-0 bottom-0 left-0 bg-[#1f4d3d] dark:bg-emerald-400 w-1/3 animate-[indeterminate_1.2s_infinite_linear]" />
        </div>
      )}

      {/* Virtualized Scrollable Grid Table Container */}
      <div
        ref={tableContainerRef}
        className="w-full overflow-auto max-h-[calc(100vh-160px)] text-xs"
      >
        <table className="w-full text-left border-collapse min-w-full">
          <thead className="sticky top-0 z-20 bg-white dark:bg-[#1c1c1f] border-b border-stone-200/80 dark:border-zinc-800/80 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
            <tr className="text-[11px] font-medium text-stone-500 dark:text-zinc-400 select-none">
              {/* Checkbox Column */}
              {!readOnly && (
                <th
                  style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}
                  className="py-2.5 px-3 text-center select-none shrink-0 bg-inherit"
                >
                  <div className="flex mx-auto w-fit">
                    <input
                      type="checkbox"
                      checked={items.length > 0 && selectedItemIds.length === items.length}
                      onChange={handleToggleSelectAll}
                      className={cn(
                        "bn-checkbox w-3.5 h-3.5 cursor-pointer",
                        selectedItemIds.length === 0 && "opacity-0 pointer-events-none"
                      )}
                    />
                  </div>
                </th>
              )}

              {/* Title Column Header */}
              <th
                style={
                  columnWidths['title']
                    ? { width: `${columnWidths['title']}px`, minWidth: `${columnWidths['title']}px`, maxWidth: `${columnWidths['title']}px` }
                    : { width: '220px', minWidth: '160px', maxWidth: '300px' }
                }
                className="py-2.5 px-3 font-semibold relative group select-none bg-inherit"
              >
                <div className="flex items-center gap-1.5 text-stone-800 dark:text-zinc-200 flex-1 min-w-0">
                  <PropertyTypeIcon type={titleProp?.type || 'title'} icon={titleProp?.icon} className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  {editingHeaderId === titleProp?.id ? (
                    <input
                      type="text"
                      value={headerTitle}
                      onChange={(e) => setHeaderTitle(e.target.value)}
                      onBlur={() => {
                        if (titleProp && onUpdateProperty && headerTitle.trim()) {
                          onUpdateProperty(titleProp.id, { name: headerTitle.trim() });
                        }
                        setEditingHeaderId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && titleProp && onUpdateProperty && headerTitle.trim()) {
                          onUpdateProperty(titleProp.id, { name: headerTitle.trim() });
                          setEditingHeaderId(null);
                        }
                      }}
                      className="w-full py-0.5 text-stone-900 dark:text-zinc-100 font-semibold focus:outline-none text-xs"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => {
                        if (!readOnly && titleProp) {
                          setEditingHeaderId(titleProp.id);
                          setHeaderTitle(titleProp.name);
                        }
                      }}
                      className="cursor-pointer w-full font-semibold truncate text-xs"
                    >
                      {titleProp?.name || 'Name'}
                    </span>
                  )}

                  {/* Title Sort Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSort('__TITLE__');
                    }}
                    className={cn(
                      "p-1 rounded hover:bg-stone-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0",
                      sortBy?.propertyId === '__TITLE__'
                        ? "text-[#1f4d3d] dark:text-emerald-400 opacity-100"
                        : "text-stone-400 opacity-0 group-hover:opacity-100"
                    )}
                    title={
                      sortBy?.propertyId === '__TITLE__'
                        ? `Sorted ${sortBy.direction.toUpperCase()} (Click to toggle)`
                        : "Sort by Title"
                    }
                  >
                    {sortBy?.propertyId === '__TITLE__' ? (
                      sortBy.direction === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div
                  onMouseDown={(e) => handleResizeStart(e, 'title')}
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-[#1f4d3d]/50 active:bg-[#1f4d3d] opacity-0 hover:opacity-100 transition-opacity z-10"
                  title="Drag to resize column"
                />
              </th>

              {nonTitleProps.map((prop) => (
                <ColumnHeaderCell
                  key={prop.id}
                  prop={prop}
                  readOnly={readOnly}
                  editingHeaderId={editingHeaderId}
                  headerTitle={headerTitle}
                  setHeaderTitle={setHeaderTitle}
                  setEditingHeaderId={setEditingHeaderId}
                  onUpdateProperty={onUpdateProperty}
                  activeOpenMenuId={activeOpenMenuId}
                  setActiveOpenMenuId={setActiveOpenMenuId}
                  handleRequestConvertType={handleRequestConvertType}
                  handleRequestDeleteProperty={handleRequestDeleteProperty}
                  width={columnWidths[prop.id]}
                  onResizeStart={(e) => handleResizeStart(e, prop.id)}
                  sortBy={sortBy}
                  onToggleSort={handleToggleSort}
                  onSetSort={onSortChange}
                />
              ))}

              {/* Persistent + Add property Button at Right Edge of Header */}
              {!readOnly && (
                <AddPropertyHeaderCell
                  activeOpenMenuId={activeOpenMenuId}
                  setActiveOpenMenuId={setActiveOpenMenuId}
                  onAddProperty={onAddProperty}
                />
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-200/35 dark:divide-zinc-800/35">
            {/* Top Virtual Spacer Row */}
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px`, padding: 0, border: 'none' }} colSpan={totalColSpan} />
              </tr>
            )}

            {/* Virtualized Rows */}
            {virtualRows.map((virtualRow) => {
              const item = items[virtualRow.index];
              if (!item) return null;
              const rowIndex = virtualRow.index;
              const isSelected = selectedItemIdsSet.current.has(item.id);
              const isFocusedRow = focusedCell?.rowIndex === rowIndex;
              const focusedColIndex = isFocusedRow ? focusedCell.colIndex : null;
              const isRowEditingCell = isFocusedRow && isEditingCell;
              const isEditingTitle = editingRowTitleId === item.id;
              const activeCellMenuId = activeOpenMenuId?.startsWith(`cell-${item.id}-`) ? activeOpenMenuId : null;

              return (
                <DatabaseTableRowMemo
                  key={item.id}
                  item={item}
                  rowIndex={rowIndex}
                  titleProp={titleProp}
                  nonTitleProps={nonTitleProps}
                  columnWidths={columnWidths}
                  readOnly={readOnly}
                  isSelected={isSelected}
                  isFocusedRow={isFocusedRow}
                  focusedColIndex={focusedColIndex}
                  isEditingCell={isRowEditingCell}
                  activeCellMenuId={activeCellMenuId}
                  isEditingRowTitle={isEditingTitle}
                  draggedRowIndex={draggedRowIndex}
                  rowPaintProps={rowPaint.getItemProps(item.id, isSelected)}
                  onSelectRow={() => {
                    setSelectedItemIds((prev) =>
                      isSelected ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                    );
                  }}
                  onDragStart={(e) => {
                    setDraggedRowIndex(rowIndex);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', item.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedRowIndex !== null && draggedRowIndex !== rowIndex) {
                      if (onReorderItems) {
                        onReorderItems(draggedRowIndex, rowIndex);
                      }
                      setDraggedRowIndex(rowIndex);
                    }
                  }}
                  onDragEnd={() => setDraggedRowIndex(null)}
                  onFocusCell={(colIndex) => {
                    setFocusedCell({ rowIndex, colIndex });
                    setIsEditingCell(false);
                  }}
                  onSelectCell={(colIndex) => {
                    setFocusedCell({ rowIndex, colIndex });
                    setIsEditingCell(true);
                  }}
                  onEnterCell={(colIndex) => handleEnterCell(rowIndex, colIndex)}
                  onNavigateCell={(colIndex, shift) => handleNavigateCell(rowIndex, colIndex, shift)}
                  onExitEditing={() => setIsEditingCell(false)}
                  onOpenRowDrawer={onOpenRowDrawer}
                  onUpdateTitle={(newTitle) => {
                    if (newTitle !== item.title) {
                      const prevTitle = item.title;
                      setUndoStack((prev) => {
                        const next = [
                          ...prev,
                          {
                            type: 'UPDATE_TITLE' as const,
                            payload: { itemId: item.id, previousTitle: prevTitle, titlePropId: titleProp?.id },
                          },
                        ];
                        return next.length > MAX_UNDO_STACK_SIZE ? next.slice(next.length - MAX_UNDO_STACK_SIZE) : next;
                      });

                      onUpdateItem(item.id, {
                        title: newTitle,
                        properties: {
                          ...item.properties,
                          ...(titleProp ? { [titleProp.id]: newTitle } : {}),
                        },
                      });
                    }
                  }}
                  onStartEditingTitle={() => {
                    setEditingRowTitleId(item.id);
                    setFocusedCell({ rowIndex, colIndex: 0 });
                    setIsEditingCell(true);
                  }}
                  onStopEditingTitle={() => setEditingRowTitleId(null)}
                  onCellChange={(propId, newVal) => {
                    const prevVal = item.properties?.[propId];
                    setUndoStack((prev) => {
                      const next = [
                        ...prev,
                        {
                          type: 'UPDATE_CELL' as const,
                          payload: { itemId: item.id, propId, previousValue: prevVal },
                        },
                      ];
                      return next.length > MAX_UNDO_STACK_SIZE ? next.slice(next.length - MAX_UNDO_STACK_SIZE) : next;
                    });

                    onUpdateItem(item.id, {
                      properties: {
                        ...item.properties,
                        [propId]: newVal,
                      },
                    });
                  }}
                  onAddOption={(prop, newOptName) => {
                    if (!onUpdateProperty) return;
                    const newOptId = newOptName.toLowerCase().replace(/\s+/g, '_');
                    const color = AUTO_COLORS[(prop.options?.length || 0) % AUTO_COLORS.length];
                    const updatedOptions = [...(prop.options || []), { id: newOptId, name: newOptName, color }];
                    onUpdateProperty(prop.id, { options: updatedOptions });
                    const val = item.properties?.[prop.id];
                    onUpdateItem(item.id, {
                      properties: {
                        ...item.properties,
                        [prop.id]: prop.type === 'multi_select' ? [...(Array.isArray(val) ? val : []), newOptId] : newOptId,
                      },
                    });
                  }}
                  onTogglePopover={(cellMenuId) => setActiveOpenMenuId(activeOpenMenuId === cellMenuId ? null : cellMenuId)}
                  onClosePopover={() => setActiveOpenMenuId(null)}
                  onPropertyCheckboxMouseDown={(propId, currentVal, e) => handlePropertyCheckboxMouseDown(item.id, propId, currentVal, e)}
                  onPropertyCheckboxMouseEnter={(propId) => handlePropertyCheckboxMouseEnter(item.id, propId)}
                  onUpdateProperty={onUpdateProperty}
                  registerTitleInputRef={(el) => {
                    if (el) titleInputRefs.current.set(item.id, el);
                    else titleInputRefs.current.delete(item.id);
                  }}
                />
              );
            })}

            {/* Bottom Virtual Spacer Row */}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px`, padding: 0, border: 'none' }} colSpan={totalColSpan} />
              </tr>
            )}

            {/* Full-width + New row Table Row */}
            {!readOnly && (
              <tr className="group hover:bg-stone-100/70 dark:hover:bg-zinc-800/40 transition-colors border-b border-stone-200/40 dark:border-zinc-800/40 select-none">
                <td
                  onClick={handleAddNewRow}
                  className="py-2 px-2 text-center text-stone-400 dark:text-zinc-500 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mx-auto text-stone-400 dark:text-zinc-500 group-hover:text-stone-700 dark:group-hover:text-zinc-300 transition-colors" />
                </td>
                <td
                  colSpan={nonTitleProps.length + 2}
                  className="py-2 px-3 text-xs text-stone-400 dark:text-zinc-500 font-normal"
                >
                  <div className="flex items-center justify-between">
                    <span
                      onClick={handleAddNewRow}
                      className="group-hover:text-stone-700 dark:group-hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                      New row
                    </span>
                    {onImportData && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onImportData();
                        }}
                        className="text-[11px] font-medium text-stone-400 hover:text-stone-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-stone-200/60 dark:hover:bg-zinc-700/60 px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer"
                        title="Import CSV, TSV or JSON data"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Import data</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {/* Infinite Scroll Loading State in Table */}
            {isFetchingNextPage && (
              <tr>
                <td colSpan={nonTitleProps.length + 3} className="py-2.5 px-4 text-center bg-stone-50/50 dark:bg-zinc-900/50 border-b border-stone-200/40 dark:border-zinc-800/40">
                  <div className="flex items-center justify-center gap-2 text-xs text-stone-500 dark:text-zinc-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-stone-400 dark:text-zinc-500" />
                    <span>Loading more rows...</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Row Count / Pagination Status Bar */}
      {totalCount !== undefined && totalCount > 0 && (
        <div className="py-2 px-2 flex items-center justify-between text-[11px] text-stone-400 dark:text-zinc-500 select-none">
          <span>Showing {items.length} of {totalCount} rows</span>
          {hasNextPage && !isFetchingNextPage && onFetchNextPage && (
            <button
              onClick={() => onFetchNextPage()}
              className="text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200 font-medium transition-colors cursor-pointer"
            >
              Load next 200 rows ↓
            </button>
          )}
        </div>
      )}

      {/* Confirmation Dialog for Column Deletion */}
      {deleteConfirmProp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 dark:bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-white">Delete Column?</h3>
            </div>
            <p className="text-xs text-stone-600 dark:text-zinc-300 leading-relaxed">
              Delete column <strong className="text-stone-900 dark:text-white">"{deleteConfirmProp.name}"</strong>? This will permanently remove data from <strong className="text-stone-900 dark:text-white">{deleteConfirmProp.count}</strong> row{deleteConfirmProp.count > 1 ? 's' : ''}.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmProp(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteProperty(deleteConfirmProp.id);
                  setDeleteConfirmProp(null);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
              >
                Delete Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Property Conversion Preview Modal */}
      {conversionPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 dark:bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-white">Property Type Conversion Preview</h3>
            </div>

            <p className="text-xs text-stone-600 dark:text-zinc-300 leading-relaxed">
              Converting <strong className="text-stone-900 dark:text-white">"{conversionPreview.propName}"</strong> to <strong className="text-indigo-600 dark:text-indigo-400">{conversionPreview.targetType}</strong>:
            </p>

            <div className="bg-stone-50 dark:bg-zinc-800/60 p-3 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-700 dark:text-zinc-300">
                <span>Cleanly convertible values:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{conversionPreview.convertible} / {conversionPreview.total}</span>
              </div>
              <div className="flex justify-between text-stone-700 dark:text-zinc-300">
                <span>Values that will be cleared:</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">{conversionPreview.lossy}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConversionPreview(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onConvertPropertyType) {
                    onConvertPropertyType(conversionPreview.propId, conversionPreview.targetType);
                  }
                  setConversionPreview(null);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#1f4d3d] hover:bg-[#183e31] text-white transition-colors cursor-pointer"
              >
                Apply Conversion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Ultra-Performant Memoized Row Component
// --------------------------------------------------------------------------
interface DatabaseTableRowProps {
  item: DatabaseItem;
  rowIndex: number;
  titleProp?: DatabaseProperty;
  nonTitleProps: DatabaseProperty[];
  columnWidths: Record<string, number>;
  readOnly: boolean;
  isSelected: boolean;
  isFocusedRow: boolean;
  focusedColIndex: number | null;
  isEditingCell: boolean;
  activeCellMenuId: string | null;
  isEditingRowTitle: boolean;
  draggedRowIndex: number | null;
  rowPaintProps: any;
  onSelectRow: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onFocusCell: (colIndex: number) => void;
  onSelectCell: (colIndex: number) => void;
  onEnterCell: (colIndex: number) => void;
  onNavigateCell: (colIndex: number, shift?: boolean) => void;
  onExitEditing: () => void;
  onOpenRowDrawer?: (item: DatabaseItem) => void;
  onUpdateTitle: (newTitle: string) => void;
  onStartEditingTitle: () => void;
  onStopEditingTitle: () => void;
  onCellChange: (propId: string, val: any) => void;
  onAddOption: (prop: DatabaseProperty, optName: string) => void;
  onTogglePopover: (cellMenuId: string) => void;
  onClosePopover: () => void;
  onPropertyCheckboxMouseDown: (propId: string, currentVal: boolean, e: React.MouseEvent) => void;
  onPropertyCheckboxMouseEnter: (propId: string) => void;
  onUpdateProperty?: (propertyId: string, updates: Partial<DatabaseProperty>) => void;
  registerTitleInputRef: (el: HTMLInputElement | null) => void;
}

function DatabaseTableRow({
  item,
  rowIndex,
  titleProp: _titleProp,
  nonTitleProps,
  columnWidths,
  readOnly,
  isSelected,
  isFocusedRow,
  focusedColIndex,
  isEditingCell,
  activeCellMenuId,
  isEditingRowTitle,
  draggedRowIndex,
  rowPaintProps,
  onDragStart,
  onDragOver,
  onDragEnd,
  onFocusCell,
  onSelectCell,
  onEnterCell,
  onNavigateCell,
  onExitEditing,
  onOpenRowDrawer,
  onUpdateTitle,
  onStartEditingTitle,
  onStopEditingTitle,
  onCellChange,
  onAddOption,
  onTogglePopover,
  onClosePopover,
  onPropertyCheckboxMouseDown,
  onPropertyCheckboxMouseEnter,
  onUpdateProperty,
  registerTitleInputRef,
}: DatabaseTableRowProps) {
  const isUntitledRow = !item.title || item.title === 'Untitled' || item.title.trim() === '';
  const isGhostedRow = !isEditingRowTitle && isUntitledRow;

  const localTitleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (localTitleRef.current && localTitleRef.current !== document.activeElement) {
      localTitleRef.current.value = item.title || '';
    }
  }, [item.title]);

  return (
    <tr
      onDragOver={onDragOver}
      className={cn(
        "group hover:bg-stone-50/70 dark:hover:bg-zinc-800/30 transition-colors",
        draggedRowIndex === rowIndex ? "opacity-50 bg-stone-100 dark:bg-zinc-800" : ""
      )}
    >
      {/* Checkbox & Row Drag Handle Column */}
      {!readOnly && (
        <td
          style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}
          className="py-2 px-3 text-center select-none shrink-0"
          {...rowPaintProps}
        >
          <div className="flex items-center justify-center gap-1 cursor-pointer">
            {/* Row Drag Handle */}
            <span
              draggable
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-stone-300 dark:text-zinc-600 hover:text-stone-600 dark:hover:text-zinc-300 p-0.5 shrink-0 transition-opacity"
              title="Drag to reorder row"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </span>

            {/* Row Checkbox (Visible on hover, or when selected) */}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => { }}
              className={`bn-checkbox w-3.5 h-3.5 cursor-pointer transition-opacity pointer-events-none ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
            />
          </div>
        </td>
      )}

      {/* Title Cell + Open Page Button */}
      <td
        onClick={() => onFocusCell(0)}
        style={
          columnWidths['title']
            ? { width: `${columnWidths['title']}px`, minWidth: `${columnWidths['title']}px`, maxWidth: `${columnWidths['title']}px` }
            : { width: '220px', minWidth: '160px', maxWidth: '300px' }
        }
        className={`py-2 px-3 font-medium transition-colors ${isFocusedRow && focusedColIndex === 0
          ? 'ring-2 ring-inset ring-[#1f4d3d] dark:ring-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
          : ''
          }`}
      >
        <div className="flex items-center justify-between gap-2">
          <input
            ref={(el) => {
              localTitleRef.current = el;
              registerTitleInputRef(el);
            }}
            type="text"
            defaultValue={item.title}
            disabled={readOnly}
            onFocus={onStartEditingTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                (e.target as HTMLInputElement).blur();
                onEnterCell(0);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                (e.target as HTMLInputElement).blur();
                onExitEditing();
              } else if (e.key === 'Tab') {
                e.preventDefault();
                e.stopPropagation();
                (e.target as HTMLInputElement).blur();
                onNavigateCell(0, e.shiftKey);
              }
            }}
            onBlur={(e) => {
              onStopEditingTitle();
              onUpdateTitle(e.target.value);
            }}
            className={cn(
              "w-full bg-transparent border-none focus:outline-none px-1.5 py-0.5 rounded text-xs transition-colors focus:text-stone-900 dark:focus:text-zinc-100 focus:opacity-100 focus:font-medium",
              isGhostedRow
                ? "text-stone-400 dark:text-zinc-500 font-normal italic opacity-60"
                : "text-stone-900 dark:text-zinc-100 font-medium opacity-100"
            )}
            placeholder="Untitled"
          />

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {onOpenRowDrawer && (
              <button
                onClick={() => onOpenRowDrawer(item)}
                className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-200/70 dark:bg-zinc-800 hover:bg-stone-300 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-300 flex items-center gap-1 cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Open</span>
              </button>
            )}
          </div>
        </div>
      </td>

      {/* Dynamic Property Cells */}
      {nonTitleProps.map((prop, colIndex) => {
        const val = item.properties?.[prop.id];
        const cellMenuId = `cell-${item.id}-${prop.id}`;
        const isCellFocused = isFocusedRow && focusedColIndex === colIndex + 1;
        const colWidth = columnWidths[prop.id];

        return (
          <td
            key={prop.id}
            onClick={() => onFocusCell(colIndex + 1)}
            style={
              colWidth
                ? { width: `${colWidth}px`, minWidth: `${colWidth}px`, maxWidth: `${colWidth}px` }
                : { width: '160px', minWidth: '120px', maxWidth: '200px' }
            }
            className={`py-2 px-3 transition-colors ${isCellFocused ? 'ring-2 ring-inset ring-[#1f4d3d] dark:ring-emerald-500' : ''
              }`}
          >
            <InteractiveCell
              prop={prop}
              value={val}
              readOnly={readOnly}
              isFocused={isCellFocused}
              isEditing={isEditingCell && isCellFocused}
              onNavigate={(shift) => onNavigateCell(colIndex + 1, shift)}
              onEnterRow={() => onEnterCell(colIndex + 1)}
              onExitEditing={onExitEditing}
              onSelectCell={() => onSelectCell(colIndex + 1)}
              onMouseDownCheckbox={(e) => onPropertyCheckboxMouseDown(prop.id, Boolean(val), e)}
              onMouseEnterCheckbox={() => onPropertyCheckboxMouseEnter(prop.id)}
              isPopoverOpen={activeCellMenuId === cellMenuId}
              onTogglePopover={() => onTogglePopover(cellMenuId)}
              onClosePopover={onClosePopover}
              onUpdateProperty={onUpdateProperty}
              onChange={(newVal) => onCellChange(prop.id, newVal)}
              onAddOption={(newOptName) => onAddOption(prop, newOptName)}
            />
          </td>
        );
      })}

      {!readOnly && <td className="py-2 px-2"></td>}
    </tr>
  );
}

const DatabaseTableRowMemo = React.memo(DatabaseTableRow, (prev, next) => {
  return (
    prev.item === next.item &&
    prev.rowIndex === next.rowIndex &&
    prev.isSelected === next.isSelected &&
    prev.isFocusedRow === next.isFocusedRow &&
    prev.focusedColIndex === next.focusedColIndex &&
    prev.isEditingCell === next.isEditingCell &&
    prev.activeCellMenuId === next.activeCellMenuId &&
    prev.isEditingRowTitle === next.isEditingRowTitle &&
    (prev.draggedRowIndex === prev.rowIndex) === (next.draggedRowIndex === next.rowIndex) &&
    prev.columnWidths === next.columnWidths &&
    prev.nonTitleProps === next.nonTitleProps &&
    prev.readOnly === next.readOnly
  );
});

// --------------------------------------------------------------------------
// Column Header & Action Components
// --------------------------------------------------------------------------
function ColumnHeaderCell({
  prop,
  readOnly,
  editingHeaderId,
  headerTitle,
  setHeaderTitle,
  setEditingHeaderId,
  onUpdateProperty,
  activeOpenMenuId,
  setActiveOpenMenuId,
  handleRequestConvertType,
  handleRequestDeleteProperty,
  width,
  onResizeStart,
  sortBy,
  onToggleSort,
  onSetSort,
}: {
  prop: DatabaseProperty;
  readOnly: boolean;
  editingHeaderId: string | null;
  headerTitle: string;
  setHeaderTitle: (title: string) => void;
  setEditingHeaderId: (id: string | null) => void;
  onUpdateProperty?: (id: string, updates: Partial<DatabaseProperty>) => void;
  activeOpenMenuId: string | null;
  setActiveOpenMenuId: (id: string | null) => void;
  handleRequestConvertType: (prop: DatabaseProperty, targetType: string) => void;
  handleRequestDeleteProperty: (prop: DatabaseProperty) => void;
  width?: number;
  onResizeStart?: (e: React.MouseEvent) => void;
  sortBy?: { propertyId: string; direction: 'asc' | 'desc' } | null;
  onToggleSort?: (propId: string) => void;
  onSetSort?: (sortBy: { propertyId: string; direction: 'asc' | 'desc' } | null) => void;
}) {
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const isOpen = activeOpenMenuId === `col-${prop.id}`;
  const isSortedThisCol = sortBy?.propertyId === prop.id;

  return (
    <th
      style={width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : { width: '160px', minWidth: '120px', maxWidth: '200px' }}
      className="py-2.5 px-3 font-medium relative group select-none bg-inherit"
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 text-stone-700 dark:text-zinc-300 flex-1 min-w-0">
          <PropertyTypeIcon type={prop.type} icon={prop.icon} className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          {editingHeaderId === prop.id ? (
            <input
              type="text"
              value={headerTitle}
              onChange={(e) => setHeaderTitle(e.target.value)}
              onBlur={() => {
                if (onUpdateProperty) onUpdateProperty(prop.id, { name: headerTitle });
                setEditingHeaderId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && onUpdateProperty) {
                  onUpdateProperty(prop.id, { name: headerTitle });
                  setEditingHeaderId(null);
                }
              }}
              className="w-full py-0.5 rounded border-brand-600 text-stone-900 dark:text-zinc-100 font-medium text-2xs focus:outline-none"
              autoFocus
            />
          ) : (
            <span
              onClick={() => {
                if (!readOnly) {
                  setEditingHeaderId(prop.id);
                  setHeaderTitle(prop.name);
                }
              }}
              className="cursor-pointer w-full hover:text-stone-950 dark:hover:text-white transition-colors truncate"
            >
              {prop.name}
            </span>
          )}

          {/* Column Sort Button */}
          {onToggleSort && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSort(prop.id);
              }}
              className={cn(
                "p-0.5 rounded hover:bg-stone-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0",
                isSortedThisCol
                  ? "text-[#1f4d3d] dark:text-emerald-400 opacity-100"
                  : "text-stone-400 opacity-0 group-hover:opacity-100"
              )}
              title={
                isSortedThisCol
                  ? `Sorted ${sortBy?.direction.toUpperCase()} (Click to toggle)`
                  : `Sort by ${prop.name}`
              }
            >
              {isSortedThisCol ? (
                sortBy?.direction === 'asc' ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                )
              ) : (
                <ArrowUpDown className="w-3 h-3" />
              )}
            </button>
          )}
        </div>

        {!readOnly && (
          <button
            ref={moreBtnRef}
            onClick={() => {
              setActiveOpenMenuId(isOpen ? null : `col-${prop.id}`);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-stone-200/70 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-stone-400" />
          </button>
        )}

        <div
          onMouseDown={onResizeStart}
          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-[#1f4d3d]/50 active:bg-[#1f4d3d] opacity-0 hover:opacity-100 transition-opacity z-10"
          title="Drag to resize column"
        />

        <DatabasePopover
          isOpen={isOpen}
          onClose={() => setActiveOpenMenuId(null)}
          triggerRef={moreBtnRef}
          align="right"
          width={220}
        >
          <div className="py-1 min-w-[200px] text-left">
            <div className="px-3 py-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
              Property Options
            </div>

            <button
              onClick={() => {
                setEditingHeaderId(prop.id);
                setHeaderTitle(prop.name);
                setActiveOpenMenuId(null);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-700/60 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-stone-400" />
              <span>Rename Column</span>
            </button>

            {/* Sorting Actions */}
            {onSetSort && (
              <>
                <div className="px-3 py-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider mt-1.5 border-t border-stone-100 dark:border-zinc-700/60 pt-1.5">
                  Sort
                </div>
                <button
                  onClick={() => {
                    onSetSort({ propertyId: prop.id, direction: 'asc' });
                    setActiveOpenMenuId(null);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer active:scale-[0.98] transition-all",
                    isSortedThisCol && sortBy?.direction === 'asc'
                      ? "bg-stone-100 dark:bg-zinc-700 text-[#1f4d3d] dark:text-emerald-400 font-semibold"
                      : "text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-700/60"
                  )}
                >
                  <ArrowUp className="w-3.5 h-3.5 text-stone-400" />
                  <span>Sort Ascending</span>
                </button>
                <button
                  onClick={() => {
                    onSetSort({ propertyId: prop.id, direction: 'desc' });
                    setActiveOpenMenuId(null);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer active:scale-[0.98] transition-all",
                    isSortedThisCol && sortBy?.direction === 'desc'
                      ? "bg-stone-100 dark:bg-zinc-700 text-[#1f4d3d] dark:text-emerald-400 font-semibold"
                      : "text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-700/60"
                  )}
                >
                  <ArrowDown className="w-3.5 h-3.5 text-stone-400" />
                  <span>Sort Descending</span>
                </button>
                {isSortedThisCol && (
                  <button
                    onClick={() => {
                      onSetSort(null);
                      setActiveOpenMenuId(null);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-stone-500 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-700/60 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 text-stone-400" />
                    <span>Clear Sort</span>
                  </button>
                )}
              </>
            )}

            {/* Change Column Icon Picker */}
            <div className="px-3 py-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider mt-1.5 border-t border-stone-100 dark:border-zinc-700/60 pt-1.5">
              Column Icon
            </div>
            <div className="px-3 py-1.5 flex flex-wrap gap-1 items-center">
              {['📊', '🚀', '📝', '🏷️', '📅', '⚡', '📌', '🎯', '💰', '👤', '🔗', '💼', '💡', '🎨', '🔍'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    if (onUpdateProperty) {
                      onUpdateProperty(prop.id, { icon: emoji });
                    }
                    setActiveOpenMenuId(null);
                  }}
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs hover:bg-stone-200 dark:hover:bg-zinc-700 active:scale-90 transition-transform cursor-pointer ${prop.icon === emoji ? 'bg-stone-200 dark:bg-zinc-700 ring-1 ring-[#1f4d3d]' : ''
                    }`}
                  title={`Set icon ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
              {prop.icon && (
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateProperty) {
                      onUpdateProperty(prop.id, { icon: null as any });
                    }
                    setActiveOpenMenuId(null);
                  }}
                  className="text-[10px] text-stone-400 hover:text-stone-700 dark:hover:text-zinc-300 ml-1 underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="px-3 py-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider mt-1.5 border-t border-stone-100 dark:border-zinc-700/60 pt-1.5">
              Change Type
            </div>
            {PROPERTY_TYPES.map((pt) => (
              <button
                key={pt.type}
                onClick={() => handleRequestConvertType(prop, pt.type)}
                className={`w-full text-left px-3 py-1 text-xs flex items-center gap-2 cursor-pointer active:scale-[0.98] transition-all ${prop.type === pt.type ? 'bg-stone-100 dark:bg-zinc-700 text-[#1f4d3d] font-semibold' : 'text-stone-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-700/60'
                  }`}
              >
                <PropertyTypeIcon type={pt.type} className="w-3 h-3 text-stone-400" />
                <span>{pt.label}</span>
              </button>
            ))}

            <div className="border-t border-stone-100 dark:border-zinc-700/60 my-1" />

            <button
              onClick={() => handleRequestDeleteProperty(prop)}
              className="w-full text-left px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Column</span>
            </button>
          </div>
        </DatabasePopover>
      </div>
    </th>
  );
}

function AddPropertyHeaderCell({
  activeOpenMenuId,
  setActiveOpenMenuId,
  onAddProperty,
}: {
  activeOpenMenuId: string | null;
  setActiveOpenMenuId: (id: string | null) => void;
  onAddProperty: (name: string, type: string) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isOpen = activeOpenMenuId === 'add-column';
  const [colName, setColName] = useState('Property');
  const [colType, setColType] = useState('text');

  useEffect(() => {
    if (isOpen) {
      setColName('Property');
      setColType('text');
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleCreate = (typeToUse?: string) => {
    const finalName = colName.trim() || 'Property';
    const finalType = typeToUse || colType || 'text';
    onAddProperty(finalName, finalType);
    setActiveOpenMenuId(null);
  };

  return (
    <th className="py-2.5 px-3 text-left font-normal relative select-none shrink-0 bg-inherit">
      <button
        ref={buttonRef}
        onClick={() => {
          setActiveOpenMenuId(isOpen ? null : 'add-column');
        }}
        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-normal text-stone-400 hover:text-stone-700 dark:hover:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer whitespace-nowrap"
        title="Add property column"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add property</span>
      </button>

      <DatabasePopover
        isOpen={isOpen}
        onClose={() => setActiveOpenMenuId(null)}
        triggerRef={buttonRef}
        align="right"
        width={260}
      >
        <div className="space-y-2.5 p-1.5 font-sans text-left">
          <div>
            <label className="block text-[10px] font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider mb-1 px-1">
              Column Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={colName}
              onChange={(e) => setColName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreate();
                }
                if (e.key === 'Escape') setActiveOpenMenuId(null);
              }}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#1f4d3d]"
              placeholder="Property"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider px-1 mb-1">
              <span>Property Type</span>
              <span className="text-[9px] font-normal text-stone-400 lowercase">Press Enter for Text</span>
            </div>

            <div className="max-h-52 overflow-y-auto space-y-0.5 no-scrollbar">
              {PROPERTY_TYPES.map((pt) => {
                const isSelected = colType === pt.type;
                return (
                  <button
                    key={pt.type}
                    type="button"
                    onClick={() => {
                      setColType(pt.type);
                      handleCreate(pt.type);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${isSelected
                      ? 'bg-stone-200/80 dark:bg-zinc-800 text-stone-950 dark:text-white font-semibold'
                      : 'text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800/60'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <PropertyTypeIcon type={pt.type} className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{pt.label}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#1f4d3d] dark:text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DatabasePopover>
    </th>
  );
}

function OptionRowItem({
  opt,
  index,
  isChecked,
  onSelect,
  onMove,
  onColorChange,
  onDelete,
  draggedIndex,
  setDraggedIndex,
}: {
  opt: { id: string; name: string; color: string };
  index: number;
  isChecked: boolean;
  onSelect: () => void;
  onMove: (from: number, to: number) => void;
  onColorChange: (newColor: string) => void;
  onDelete?: () => void;
  draggedIndex: number | null;
  setDraggedIndex: (idx: number | null) => void;
}) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const badge = getOptionBadgeStyles(opt.color);

  return (
    <div
      draggable
      onDragStart={(e) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', opt.id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (draggedIndex !== null && draggedIndex !== index) {
          onMove(draggedIndex, index);
          setDraggedIndex(index);
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== index) {
          onMove(draggedIndex, index);
          setDraggedIndex(index);
        }
      }}
      onDragEnd={() => {
        setDraggedIndex(null);
        setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDraggedIndex(null);
        setDragOver(false);
      }}
      className={cn(
        "group/opt flex flex-col p-1.5 rounded-lg transition-all duration-150 select-none",
        draggedIndex === index
          ? "opacity-40 bg-stone-100 dark:bg-zinc-800 scale-[0.99]"
          : dragOver
            ? "bg-stone-100 dark:bg-zinc-800"
            : isChecked
              ? "bg-stone-100/90 dark:bg-zinc-800/80"
              : "hover:bg-stone-100/70 dark:hover:bg-zinc-800/50"
      )}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {/* Drag Handle */}
          <span
            className="cursor-grab active:cursor-grabbing text-stone-300 dark:text-zinc-600 hover:text-stone-600 dark:hover:text-zinc-300 transition-colors p-0.5 shrink-0 opacity-0 group-hover/opt:opacity-100"
            title="Drag to reorder option"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </span>

          {/* Option Pill Badge */}
          <span
            onClick={onSelect}
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer select-none truncate max-w-[140px]",
              badge.className
            )}
            style={badge.style}
          >
            {opt.name}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Color Palette Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPicker(!showColorPicker);
            }}
            className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 opacity-0 group-hover/opt:opacity-100 hover:bg-stone-200/60 dark:hover:bg-zinc-700/60 transition-all cursor-pointer"
            title="Change color"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>

          {/* Delete Option */}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 opacity-0 group-hover/opt:opacity-100 transition-all cursor-pointer"
              title="Delete option"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Checkmark */}
          {isChecked && <Check className="w-3.5 h-3.5 text-[#1f4d3d] dark:text-emerald-400 shrink-0 stroke-[2.5]" />}
        </div>
      </div>

      {/* Color Palette Swatches (Clean Notion Preview Badges) */}
      {showColorPicker && (
        <div className="mt-2 p-2 bg-stone-50 dark:bg-zinc-900 rounded-lg border border-stone-200/70 dark:border-zinc-700/70 grid grid-cols-2 gap-1.5 animate-in fade-in duration-100">
          {APPLE_COLORS.map((color) => {
            const isSelectedColor =
              opt.color?.toLowerCase() === color.hex.toLowerCase() ||
              opt.color?.toLowerCase() === color.name.toLowerCase();
            const swatchBadge = getOptionBadgeStyles(color.hex);
            return (
              <button
                key={color.name}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onColorChange(color.hex);
                  setShowColorPicker(false);
                }}
                className={cn(
                  "w-full px-2 py-1 rounded-md text-[10px] font-medium transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-between shadow-2xs",
                  swatchBadge.className,
                  isSelectedColor ? "ring-2 ring-stone-900 dark:ring-white font-semibold" : "opacity-90 hover:opacity-100"
                )}
                style={swatchBadge.style}
                title={color.name}
              >
                <span>{color.name}</span>
                {isSelectedColor && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Interactive Cell Implementation
// --------------------------------------------------------------------------
interface InteractiveCellProps {
  prop: DatabaseProperty;
  value: any;
  onChange: (val: any) => void;
  onAddOption: (name: string) => void;
  onUpdateProperty?: (propertyId: string, updates: Partial<DatabaseProperty>) => void;
  readOnly?: boolean;
  isPopoverOpen?: boolean;
  onTogglePopover?: () => void;
  onClosePopover?: () => void;
  isFocused?: boolean;
  isEditing?: boolean;
  onNavigate?: (shift: boolean) => void;
  onEnterRow?: () => void;
  onExitEditing?: () => void;
  onSelectCell?: () => void;
  onMouseDownCheckbox?: (e: React.MouseEvent) => void;
  onMouseEnterCheckbox?: () => void;
}

function InteractiveCell({
  prop,
  value,
  onChange,
  onAddOption,
  onUpdateProperty,
  readOnly,
  isPopoverOpen: isPopoverOpenProp,
  onTogglePopover,
  onClosePopover,
  isFocused: _isFocused = false,
  isEditing = false,
  onNavigate,
  onEnterRow,
  onExitEditing,
  onSelectCell,
  onMouseDownCheckbox,
  onMouseEnterCheckbox,
}: InteractiveCellProps) {
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const isPopoverOpen = isPopoverOpenProp !== undefined ? isPopoverOpenProp : localIsOpen;

  const togglePopover = () => {
    if (onTogglePopover) {
      onTogglePopover();
    } else {
      setLocalIsOpen(!localIsOpen);
    }
  };

  const closePopover = () => {
    if (onClosePopover) {
      onClosePopover();
    } else {
      setLocalIsOpen(false);
    }
  };

  const handleKeyDownCell = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      if (onNavigate) onNavigate(e.shiftKey);
    } else if (e.key === 'Enter' && !isPopoverOpen) {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).blur();
      if (onEnterRow) onEnterRow();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).blur();
      if (onExitEditing) onExitEditing();
    }
  };

  const handleOptionColorChange = (optId: string, newHex: string) => {
    if (!onUpdateProperty) return;
    const updatedOptions = (prop.options || []).map((o) =>
      o.id === optId ? { ...o, color: newHex } : o
    );
    onUpdateProperty(prop.id, { options: updatedOptions });
  };

  const handleMoveOption = (fromIndex: number, toIndex: number) => {
    if (!onUpdateProperty) return;
    const currentOptions = [...(prop.options || [])];
    if (toIndex < 0 || toIndex >= currentOptions.length) return;
    const [moved] = currentOptions.splice(fromIndex, 1);
    currentOptions.splice(toIndex, 0, moved);
    onUpdateProperty(prop.id, { options: currentOptions });
  };

  const handleDeleteOption = (optId: string) => {
    if (!onUpdateProperty) return;
    const updatedOptions = (prop.options || []).filter((o) => o.id !== optId);
    onUpdateProperty(prop.id, { options: updatedOptions });

    if (prop.type === 'multi_select') {
      const selectedIds: string[] = Array.isArray(value) ? value : [];
      const next = selectedIds.filter((id) => id !== optId);
      onChange(next);
    } else if (value === optId) {
      onChange(null);
    }
  };

  const validation = validatePropertyValue(prop.type, value);
  const isInvalid = !validation.isValid;
  const cellInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cellInputRef.current && cellInputRef.current !== document.activeElement) {
      cellInputRef.current.value = value ?? '';
    }
  }, [value]);

  useEffect(() => {
    if (isEditing && cellInputRef.current && document.activeElement !== cellInputRef.current) {
      cellInputRef.current.focus();
      if ('select' in cellInputRef.current && typeof cellInputRef.current.select === 'function') {
        cellInputRef.current.select();
      }
    }
  }, [isEditing]);

  switch (prop.type) {
    case 'text':
      return (
        <input
          ref={cellInputRef}
          type="text"
          defaultValue={value || ''}
          disabled={readOnly}
          onBlur={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDownCell}
          className="w-full bg-transparent border-none focus:outline-none px-1.5 py-0.5 rounded text-stone-800 dark:text-zinc-200 placeholder:text-stone-300 dark:placeholder:text-zinc-600 placeholder:italic placeholder:font-normal"
          placeholder="Empty"
        />
      );

    case 'number':
      return (
        <div className="relative flex items-center">
          <input
            ref={cellInputRef}
            type="number"
            defaultValue={value ?? ''}
            disabled={readOnly}
            onBlur={(e) => onChange(e.target.value !== '' ? Number(e.target.value) : null)}
            onKeyDown={handleKeyDownCell}
            className={`w-full bg-transparent border-none focus:outline-none px-1.5 py-0.5 rounded text-stone-800 dark:text-zinc-200 font-mono tabular-nums placeholder:text-stone-300 dark:placeholder:text-zinc-600 placeholder:font-normal ${isInvalid ? 'ring-1 ring-rose-500 bg-rose-50/20' : ''
              }`}
            placeholder="0"
          />
          {isInvalid && (
            <span className="text-rose-500 px-1 shrink-0" title={validation.errorMessage}>
              <AlertCircle className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      );

    case 'checkbox':
      return (
        <div
          onMouseDown={(e) => {
            if (onMouseDownCheckbox) onMouseDownCheckbox(e);
            else onChange(!Boolean(value));
          }}
          onMouseEnter={() => {
            if (onMouseEnterCheckbox) onMouseEnterCheckbox();
          }}
          className="flex items-center h-full px-1 cursor-pointer select-none"
        >
          <input
            ref={cellInputRef}
            type="checkbox"
            checked={Boolean(value)}
            disabled={readOnly}
            onChange={() => { }}
            onKeyDown={handleKeyDownCell}
            className="bn-checkbox w-4 h-4 cursor-pointer pointer-events-none"
          />
        </div>
      );

    case 'date':
      return (
        <div className="relative flex items-center gap-1" ref={triggerRef}>
          <input
            ref={(el) => {
              if (el && isEditing && document.activeElement !== el) {
                el.focus();
              }
            }}
            type="text"
            defaultValue={value || ''}
            disabled={readOnly}
            onBlur={(e) => {
              const val = e.target.value;
              const parsed = parseDateInput(val);
              if (parsed !== null) onChange(parsed);
              else onChange(val);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                e.stopPropagation();
                if (onNavigate) onNavigate(e.shiftKey);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                const val = (e.target as HTMLInputElement).value;
                const parsed = parseDateInput(val);
                if (parsed !== null) onChange(parsed);
                else onChange(val);
                (e.target as HTMLInputElement).blur();
                if (onEnterRow) onEnterRow();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                (e.target as HTMLInputElement).blur();
                if (onExitEditing) onExitEditing();
              }
            }}
            className={`w-full bg-transparent border-none focus:outline-none px-1 py-0.5 rounded text-xs text-stone-800 dark:text-zinc-200 placeholder:text-stone-300 dark:placeholder:text-zinc-600 placeholder:italic placeholder:font-normal ${isInvalid ? 'ring-1 ring-rose-500 bg-rose-50/20' : ''
              }`}
            placeholder="Date..."
          />
          <button
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && togglePopover()}
            className="p-1 rounded text-[#1f4d3d] dark:text-emerald-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800 cursor-pointer shrink-0"
            title="Open Calendar Picker"
          >
            <Calendar className="w-3.5 h-3.5" />
          </button>

          <DatabasePopover
            isOpen={isPopoverOpen}
            onClose={closePopover}
            triggerRef={triggerRef}
            width={270}
          >
            <CustomDatePicker
              value={value}
              onChange={(d) => {
                onChange(d);
                closePopover();
              }}
              onClose={closePopover}
              readOnly={readOnly}
            />
          </DatabasePopover>
        </div>
      );

    case 'select':
    case 'status':
    case 'multi_select': {
      const selectedIds: string[] = Array.isArray(value) ? value : value ? [value] : [];
      const selectedOpts = prop.options?.filter((o) => selectedIds.includes(o.id)) || [];

      const filteredOptions = (prop.options || []).filter((opt) =>
        opt.name.toLowerCase().includes(searchInput.toLowerCase().trim())
      );

      const exactMatchExists = (prop.options || []).some(
        (opt) => opt.name.toLowerCase() === searchInput.toLowerCase().trim()
      );

      const handleEnterKeyPress = () => {
        const query = searchInput.trim();
        if (!query) return;

        // Auto-select top remaining matching option
        if (filteredOptions.length > 0) {
          const topMatch = filteredOptions[0];
          if (prop.type === 'multi_select') {
            const isChecked = selectedIds.includes(topMatch.id);
            const next = isChecked
              ? selectedIds.filter((id) => id !== topMatch.id)
              : [...selectedIds, topMatch.id];
            onChange(next);
          } else {
            onChange(topMatch.id);
            closePopover();
          }
          setSearchInput('');
        } else {
          // Create new option
          onAddOption(query);
          setSearchInput('');
          closePopover();
        }
      };

      return (
        <div className="relative" ref={triggerRef}>
          <div
            tabIndex={0}
            ref={(el) => {
              if (el && isEditing && document.activeElement !== el && !isPopoverOpen) {
                el.focus();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                closePopover();
                if (onExitEditing) onExitEditing();
              } else if (!isPopoverOpen) {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  togglePopover();
                } else if (e.key === 'Tab') {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onNavigate) onNavigate(e.shiftKey);
                }
              }
            }}
            onClick={(e) => {
              if (readOnly) return;
              e.stopPropagation();
              if (onSelectCell) onSelectCell();
              togglePopover();
            }}
            className="flex flex-wrap gap-1 items-center px-1.5 py-1 min-h-6.5 cursor-pointer rounded-md transition-colors focus:outline-none"
          >
            {selectedOpts.length > 0 ? (
              selectedOpts.map((opt) => {
                const badge = getOptionBadgeStyles(opt.color);
                return (
                  <span
                    key={opt.id}
                    className={cn(
                      "group/tag inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors",
                      badge.className
                    )}
                    style={badge.style}
                  >
                    <span>{opt.name}</span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (prop.type === 'multi_select') {
                            const next = selectedIds.filter((id) => id !== opt.id);
                            onChange(next);
                          } else {
                            onChange(null);
                          }
                        }}
                        className="hover:opacity-100 opacity-40 hover:bg-black/10 dark:hover:bg-white/10 rounded p-0.2 transition-all cursor-pointer"
                        title="Remove tag"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </span>
                );
              })
            ) : (
              <span className="inline-flex items-center focus:outline-none gap-1.5 text-[11px] font-normal text-stone-300 dark:text-zinc-600 select-none">
                <PropertyTypeIcon type={prop.type} className="w-3.5 h-3.5 opacity-40 shrink-0" />
                <span>Select...</span>
              </span>
            )}
          </div>

          <DatabasePopover
            isOpen={isPopoverOpen}
            onClose={closePopover}
            triggerRef={triggerRef}
            width={240}
          >
            <div className="p-1.5 space-y-2 font-sans text-left">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search or create option..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleEnterKeyPress();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      closePopover();
                      if (onExitEditing) onExitEditing();
                    }
                  }}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded border bg-stone-50 dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#1f4d3d]"
                  autoFocus
                />
              </div>

              {/* Unselect / Clear Selection Action */}
              {selectedIds.length > 0 && (
                <div className="flex items-center justify-between px-1 text-[11px] text-stone-500 dark:text-zinc-400 border-b border-stone-100 dark:border-zinc-800/80 pb-1">
                  <span>{selectedIds.length} selected</span>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(prop.type === 'multi_select' ? [] : null);
                      if (prop.type !== 'multi_select') closePopover();
                    }}
                    className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium hover:underline cursor-pointer transition-colors"
                  >
                    {prop.type === 'multi_select' ? 'Unselect all' : 'Clear selection'}
                  </button>
                </div>
              )}

              <div className="max-h-48 overflow-y-auto space-y-1.5 no-scrollbar">
                {filteredOptions.map((opt) => {
                  const isChecked = selectedIds.includes(opt.id);
                  const realIndex = (prop.options || []).findIndex((o) => o.id === opt.id);

                  return (
                    <OptionRowItem
                      key={opt.id}
                      opt={opt}
                      index={realIndex}
                      isChecked={isChecked}
                      onSelect={() => {
                        if (prop.type === 'multi_select') {
                          const next = isChecked
                            ? selectedIds.filter((id) => id !== opt.id)
                            : [...selectedIds, opt.id];
                          onChange(next);
                        } else {
                          onChange(isChecked ? null : opt.id);
                          closePopover();
                        }
                      }}
                      onMove={handleMoveOption}
                      onColorChange={(newHex) => handleOptionColorChange(opt.id, newHex)}
                      onDelete={() => handleDeleteOption(opt.id)}
                      draggedIndex={draggedIndex}
                      setDraggedIndex={setDraggedIndex}
                    />
                  );
                })}

                {filteredOptions.length === 0 && !searchInput.trim() && (
                  <div className="text-[11px] text-stone-400 text-center py-2 italic">
                    No options created yet
                  </div>
                )}
              </div>

              {/* Explicit "+ Create '[searchInput]'" button if no exact match */}
              {searchInput.trim() && !exactMatchExists && (
                <div className="pt-2 border-t border-stone-200/80 dark:border-zinc-800/80">
                  <button
                    onClick={() => {
                      onAddOption(searchInput.trim());
                      setSearchInput('');
                      closePopover();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1f4d3d] text-white rounded-lg hover:bg-[#183e31] active:scale-[0.96] transition-transform cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create "{searchInput.trim()}"</span>
                  </button>
                </div>
              )}
            </div>
          </DatabasePopover>
        </div>
      );
    }

    case 'url':
      return (
        <div className="flex items-center gap-1">
          <input
            ref={cellInputRef}
            type="url"
            defaultValue={value || ''}
            disabled={readOnly}
            onBlur={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDownCell}
            className={`w-full bg-transparent focus:bg-stone-100 dark:focus:bg-zinc-800 border-none focus:outline-none px-1.5 py-0.5 rounded text-stone-800 dark:text-zinc-200 ${isInvalid ? 'ring-1 ring-rose-500 bg-rose-50/20' : ''
              }`}
            placeholder="https://..."
          />
          {value && !isInvalid && (
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="p-1 text-[#1f4d3d] dark:text-emerald-400 hover:opacity-80 shrink-0"
              title="Open Link"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {isInvalid && (
            <span className="text-rose-500 px-1 shrink-0" title={validation.errorMessage}>
              <AlertCircle className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      );

    case 'email':
      return (
        <div className="flex items-center gap-1">
          <input
            ref={cellInputRef}
            type="email"
            defaultValue={value || ''}
            disabled={readOnly}
            onBlur={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDownCell}
            className={`w-full bg-transparent focus:bg-stone-100 dark:focus:bg-zinc-800 border-none focus:outline-none px-1.5 py-0.5 rounded text-stone-800 dark:text-zinc-200 ${isInvalid ? 'ring-1 ring-rose-500 bg-rose-50/20' : ''
              }`}
            placeholder="name@domain.com"
          />
          {isInvalid && (
            <span className="text-rose-500 px-1 shrink-0" title={validation.errorMessage}>
              <AlertCircle className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      );

    default:
      return (
        <input
          ref={cellInputRef}
          type="text"
          defaultValue={value || ''}
          disabled={readOnly}
          onBlur={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDownCell}
          className="w-full bg-transparent focus:bg-stone-100 dark:focus:bg-zinc-800 border-none focus:outline-none px-1.5 py-0.5 rounded text-stone-800 dark:text-zinc-200"
        />
      );
  }
}
