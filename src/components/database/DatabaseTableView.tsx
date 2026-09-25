import React, { useState, useEffect, useRef } from 'react';
import type { DatabaseProperty, DatabaseItem } from '~/db/schema';
import { PropertyTypeIcon } from './PropertyTypeIcon';
import { DatabasePopover } from './DatabasePopover';
import {
  Plus,
  Trash2,
  MoreHorizontal,
  ExternalLink,
  Check,
  Calendar,
  Tag as TagIcon,
  Maximize2,
  ChevronDown,
  Edit2,
  RefreshCw,
  AlertTriangle,
  Undo2,
} from 'lucide-react';

interface DatabaseTableViewProps {
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  onUpdateItem: (itemId: string, updates: { title?: string; properties?: Record<string, any> }) => void;
  onDeleteItem: (itemId: string) => void;
  onDeleteItemsBulk?: (itemIds: string[]) => void;
  onAddItem: () => void;
  onAddProperty: (name: string, type: string) => void;
  onDeleteProperty: (propertyId: string) => void;
  onConvertPropertyType?: (propertyId: string, newType: string) => void;
  onUpdateProperty?: (propertyId: string, updates: Partial<DatabaseProperty>) => void;
  onOpenRowDrawer?: (item: DatabaseItem) => void;
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

const AUTO_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#64748b'];

export function DatabaseTableView({
  properties,
  items,
  onUpdateItem,
  onDeleteItem,
  onDeleteItemsBulk,
  onAddItem,
  onAddProperty,
  onDeleteProperty,
  onConvertPropertyType,
  onUpdateProperty,
  onOpenRowDrawer,
  readOnly = false,
}: DatabaseTableViewProps) {
  // Add Column Inline State
  const [newColName, setNewColName] = useState('New Column');
  const [newColType, setNewColType] = useState('text');

  // Unified State-Aware Menu ID (no overlapping dropdowns ever!)
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

  // Client-Side Undo Stack (Cmd+Z)
  const [undoStack, setUndoStack] = useState<Array<{ type: string; payload: any }>>([]);

  const titleProp = properties.find((p) => p.type === 'title');
  const nonTitleProps = properties.filter((p) => p.type !== 'title');

  // Handle Cmd+Z Undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (undoStack.length > 0) {
          e.preventDefault();
          const lastAction = undoStack[undoStack.length - 1];
          setUndoStack((prev) => prev.slice(0, -1));

          if (lastAction.type === 'UPDATE_ITEM') {
            onUpdateItem(lastAction.payload.itemId, lastAction.payload.previousState);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, onUpdateItem]);

  // Handle Column Creation
  const handleCommitAddColumn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newColName.trim()) return;
    onAddProperty(newColName.trim(), newColType);
    setActiveOpenMenuId(null);
  };

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

  const handleToggleSelectItem = (id: string) => {
    if (selectedItemIds.includes(id)) {
      setSelectedItemIds(selectedItemIds.filter((i) => i !== id));
    } else {
      setSelectedItemIds([...selectedItemIds, id]);
    }
  };

  const handleBulkDelete = () => {
    if (onDeleteItemsBulk && selectedItemIds.length > 0) {
      onDeleteItemsBulk(selectedItemIds);
      setSelectedItemIds([]);
    }
  };

  return (
    <div className="w-full space-y-3 font-sans">
      {/* Top Action Bar for Bulk Selection */}
      {selectedItemIds.length > 0 && (
        <div className="flex items-center justify-between p-2.5 px-4 bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-xl shadow-xs text-xs animate-in fade-in duration-150">
          <span className="font-semibold text-stone-800 dark:text-zinc-200">
            {selectedItemIds.length} row{selectedItemIds.length > 1 ? 's' : ''} selected
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>

            <button
              onClick={() => setSelectedItemIds([])}
              className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-900 dark:hover:text-zinc-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Grid Table */}
      <div className="w-full overflow-x-auto rounded-xl border border-stone-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#18181b] shadow-2xs text-xs">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-stone-50/90 dark:bg-zinc-900/80 border-b border-stone-200/80 dark:border-zinc-800/80 text-[11px] font-medium text-stone-500 dark:text-zinc-400 select-none">
              {/* Checkbox Column */}
              <th className="py-2.5 px-3 w-10 text-center border-r border-stone-200/70 dark:border-zinc-800/70">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selectedItemIds.length === items.length}
                  onChange={handleToggleSelectAll}
                  className="w-3.5 h-3.5 rounded border-stone-300 text-[#1f4d3d] focus:ring-[#1f4d3d] cursor-pointer"
                />
              </th>

              {/* Title Column Header */}
              <th className="py-2.5 px-3 w-64 border-r border-stone-200/70 dark:border-zinc-800/70 font-medium">
                {editingHeaderId === titleProp?.id ? (
                  <input
                    type="text"
                    value={headerTitle}
                    onChange={(e) => setHeaderTitle(e.target.value)}
                    onBlur={() => {
                      if (titleProp && onUpdateProperty) {
                        onUpdateProperty(titleProp.id, { name: headerTitle });
                      }
                      setEditingHeaderId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && titleProp && onUpdateProperty) {
                        onUpdateProperty(titleProp.id, { name: headerTitle });
                        setEditingHeaderId(null);
                      }
                    }}
                    className="w-full px-1.5 py-0.5 border rounded bg-white dark:bg-zinc-900 border-[#1f4d3d] text-stone-900 dark:text-zinc-100 font-semibold"
                    autoFocus
                  />
                ) : (
                  <div
                    onClick={() => {
                      if (!readOnly && titleProp) {
                        setEditingHeaderId(titleProp.id);
                        setHeaderTitle(titleProp.name);
                      }
                    }}
                    className="flex items-center gap-1.5 text-stone-800 dark:text-zinc-200 cursor-pointer hover:text-[#1f4d3d] font-semibold"
                  >
                    <PropertyTypeIcon type={titleProp?.type || 'title'} className="w-3.5 h-3.5 text-stone-400" />
                    <span>{titleProp?.name || 'Name'}</span>
                  </div>
                )}
              </th>

              {/* Dynamic Property Column Headers */}
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
                />
              ))}

              {/* Persistent + Button at Right Edge of Header */}
              {!readOnly && (
                <AddPropertyHeaderCell
                  activeOpenMenuId={activeOpenMenuId}
                  setActiveOpenMenuId={setActiveOpenMenuId}
                  newColName={newColName}
                  setNewColName={setNewColName}
                  newColType={newColType}
                  setNewColType={setNewColType}
                  onAddProperty={onAddProperty}
                />
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-200/70 dark:divide-zinc-800/70">
            {items.map((item) => (
              <tr key={item.id} className="group hover:bg-stone-50/70 dark:hover:bg-zinc-800/30 transition-colors">
                {/* Row Checkbox */}
                <td className="py-2 px-3 text-center border-r border-stone-200/70 dark:border-zinc-800/70">
                  <input
                    type="checkbox"
                    checked={selectedItemIds.includes(item.id)}
                    onChange={() => handleToggleSelectItem(item.id)}
                    className="w-3.5 h-3.5 rounded border-stone-300 text-[#1f4d3d] focus:ring-[#1f4d3d] cursor-pointer"
                  />
                </td>

                {/* Title Cell + Open Page Button */}
                <td className="py-2 px-3 border-r border-stone-200/70 dark:border-zinc-800/70 font-medium text-stone-900 dark:text-zinc-100">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      defaultValue={item.title}
                      disabled={readOnly}
                      onBlur={(e) => {
                        if (e.target.value !== item.title) {
                          onUpdateItem(item.id, {
                            title: e.target.value,
                            properties: {
                              ...item.properties,
                              ...(titleProp ? { [titleProp.id]: e.target.value } : {}),
                            },
                          });
                        }
                      }}
                      className="w-full bg-transparent border-none focus:bg-stone-100 dark:focus:bg-zinc-800 focus:outline-none px-1.5 py-0.5 rounded text-stone-900 dark:text-zinc-100 font-medium"
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

                      {!readOnly && (
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="p-1 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Delete Row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </td>

                {/* Dynamic Property Cells */}
                {nonTitleProps.map((prop) => {
                  const val = item.properties?.[prop.id];
                  const cellMenuId = `cell-${item.id}-${prop.id}`;

                  return (
                    <td key={prop.id} className="py-2 px-3 border-r border-stone-200/70 dark:border-zinc-800/70">
                      <InteractiveCell
                        prop={prop}
                        value={val}
                        readOnly={readOnly}
                        isPopoverOpen={activeOpenMenuId === cellMenuId}
                        onTogglePopover={() => setActiveOpenMenuId(activeOpenMenuId === cellMenuId ? null : cellMenuId)}
                        onClosePopover={() => setActiveOpenMenuId(null)}
                        onChange={(newVal) => {
                          const prevProps = { ...item.properties };
                          setUndoStack((prev) => [
                            ...prev,
                            {
                              type: 'UPDATE_ITEM',
                              payload: { itemId: item.id, previousState: { properties: prevProps } },
                            },
                          ]);

                          onUpdateItem(item.id, {
                            properties: {
                              ...item.properties,
                              [prop.id]: newVal,
                            },
                          });
                        }}
                        onAddOption={(newOptName) => {
                          if (!onUpdateProperty) return;
                          const newOptId = newOptName.toLowerCase().replace(/\s+/g, '_');
                          const color = AUTO_COLORS[(prop.options?.length || 0) % AUTO_COLORS.length];
                          const updatedOptions = [...(prop.options || []), { id: newOptId, name: newOptName, color }];
                          onUpdateProperty(prop.id, { options: updatedOptions });
                          onUpdateItem(item.id, {
                            properties: {
                              ...item.properties,
                              [prop.id]: prop.type === 'multi_select' ? [...(Array.isArray(val) ? val : []), newOptId] : newOptId,
                            },
                          });
                        }}
                      />
                    </td>
                  );
                })}

                {!readOnly && <td className="py-2 px-2"></td>}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Persistent + New Row Button */}
        {!readOnly && (
          <div className="p-2 border-t border-stone-200/70 dark:border-zinc-800/70 bg-stone-50/40 dark:bg-zinc-900/40">
            <button
              onClick={onAddItem}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-stone-400" />
              <span>New row</span>
            </button>
          </div>
        )}
      </div>

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
}) {
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const isOpen = activeOpenMenuId === `col-${prop.id}`;

  return (
    <th className="py-2.5 px-3 min-w-[150px] border-r border-stone-200/70 dark:border-zinc-800/70 font-medium relative group">
      <div className="flex items-center justify-between">
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
            className="w-full px-1 py-0.5 border rounded bg-white dark:bg-zinc-900 border-[#1f4d3d] text-stone-900 dark:text-zinc-100 font-medium"
            autoFocus
          />
        ) : (
          <div
            onClick={() => {
              if (!readOnly) {
                setEditingHeaderId(prop.id);
                setHeaderTitle(prop.name);
              }
            }}
            className="flex items-center gap-1.5 text-stone-700 dark:text-zinc-300 cursor-pointer hover:text-stone-950 dark:hover:text-white"
          >
            <PropertyTypeIcon type={prop.type} className="w-3.5 h-3.5 text-stone-400" />
            <span>{prop.name}</span>
          </div>
        )}

        {!readOnly && (
          <button
            ref={moreBtnRef}
            onClick={() => {
              setActiveOpenMenuId(isOpen ? null : `col-${prop.id}`);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-stone-200/70 dark:hover:bg-zinc-800 transition-opacity cursor-pointer"
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-stone-400" />
          </button>
        )}

        <DatabasePopover
          isOpen={isOpen}
          onClose={() => setActiveOpenMenuId(null)}
          triggerRef={moreBtnRef}
          align="right"
          width={180}
        >
          <div className="py-1 min-w-[160px] text-left">
            <div className="px-3 py-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
              Property Options
            </div>

            <button
              onClick={() => {
                setEditingHeaderId(prop.id);
                setHeaderTitle(prop.name);
                setActiveOpenMenuId(null);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-700/60 flex items-center gap-2 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-stone-400" />
              <span>Rename Column</span>
            </button>

            <div className="px-3 py-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider mt-1.5 border-t border-stone-100 dark:border-zinc-700/60 pt-1.5">
              Change Type
            </div>
            {PROPERTY_TYPES.map((pt) => (
              <button
                key={pt.type}
                onClick={() => handleRequestConvertType(prop, pt.type)}
                className={`w-full text-left px-3 py-1 text-xs flex items-center gap-2 cursor-pointer ${prop.type === pt.type ? 'bg-stone-100 dark:bg-zinc-700 text-[#1f4d3d] font-semibold' : 'text-stone-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-700/60'}`}
              >
                <PropertyTypeIcon type={pt.type} className="w-3 h-3 text-stone-400" />
                <span>{pt.label}</span>
              </button>
            ))}

            <div className="border-t border-stone-100 dark:border-zinc-700/60 my-1" />

            <button
              onClick={() => handleRequestDeleteProperty(prop)}
              className="w-full text-left px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer"
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
  newColName,
  setNewColName,
  newColType,
  setNewColType,
  onAddProperty,
}: {
  activeOpenMenuId: string | null;
  setActiveOpenMenuId: (id: string | null) => void;
  newColName: string;
  setNewColName: (name: string) => void;
  newColType: string;
  setNewColType: (type: string) => void;
  onAddProperty: (name: string, type: string) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isOpen = activeOpenMenuId === 'add-column';

  return (
    <th className="py-2.5 px-3 w-12 text-center font-normal relative">
      <button
        ref={buttonRef}
        onClick={() => {
          setNewColName('Property');
          setNewColType('text');
          setActiveOpenMenuId(isOpen ? null : 'add-column');
        }}
        className="p-1 hover:bg-stone-200/80 dark:hover:bg-zinc-800 rounded-md text-stone-400 hover:text-stone-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
        title="Add property column"
      >
        <Plus className="w-4 h-4" />
      </button>

      <DatabasePopover
        isOpen={isOpen}
        onClose={() => setActiveOpenMenuId(null)}
        triggerRef={buttonRef}
        align="right"
        width={250}
      >
        <div className="space-y-2 p-1 font-sans text-left">
          <div className="text-[10px] font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider px-1">
            Property Name
          </div>

          <input
            type="text"
            placeholder="Property name..."
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (newColName.trim()) {
                  onAddProperty(newColName.trim(), newColType);
                  setActiveOpenMenuId(null);
                }
              }
              if (e.key === 'Escape') setActiveOpenMenuId(null);
            }}
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/80 text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#1f4d3d]"
            autoFocus
          />

          <div className="text-[10px] font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider px-1 pt-1">
            Select Type
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5 no-scrollbar">
            {PROPERTY_TYPES.map((pt) => (
              <button
                key={pt.type}
                type="button"
                onClick={() => {
                  onAddProperty(newColName.trim() || pt.label, pt.type);
                  setActiveOpenMenuId(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <PropertyTypeIcon type={pt.type} className="w-3.5 h-3.5 text-stone-400" />
                <span>{pt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </DatabasePopover>
    </th>
  );
}

interface InteractiveCellProps {
  prop: DatabaseProperty;
  value: any;
  onChange: (val: any) => void;
  onAddOption: (name: string) => void;
  readOnly?: boolean;
  isPopoverOpen?: boolean;
  onTogglePopover?: () => void;
  onClosePopover?: () => void;
}

function InteractiveCell({
  prop,
  value,
  onChange,
  onAddOption,
  readOnly,
  isPopoverOpen: isPopoverOpenProp,
  onTogglePopover,
  onClosePopover,
}: InteractiveCellProps) {
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const [newOptionInput, setNewOptionInput] = useState('');
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

  switch (prop.type) {
    case 'text':
      return (
        <input
          type="text"
          defaultValue={value || ''}
          disabled={readOnly}
          onBlur={(e) => onChange(e.target.value)}
          className="w-full bg-transparent focus:bg-stone-100 dark:focus:bg-zinc-800 border-none focus:outline-none px-1.5 py-0.5 rounded text-stone-800 dark:text-zinc-200 placeholder-stone-400"
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
          className="w-full bg-transparent focus:bg-stone-100 dark:focus:bg-zinc-800 border-none focus:outline-none px-1.5 py-0.5 rounded text-stone-800 dark:text-zinc-200 font-mono"
          placeholder="0"
        />
      );

    case 'checkbox':
      return (
        <div className="flex items-center h-full px-1">
          <input
            type="checkbox"
            checked={Boolean(value)}
            disabled={readOnly}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-stone-300 dark:border-zinc-700 text-[#1f4d3d] focus:ring-[#1f4d3d] cursor-pointer"
          />
        </div>
      );

    case 'date':
      return (
        <input
          type="date"
          defaultValue={value || ''}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent focus:bg-stone-100 dark:focus:bg-zinc-800 border-none focus:outline-none px-1 py-0.5 rounded text-xs text-stone-800 dark:text-zinc-200"
        />
      );

    case 'select':
    case 'status':
    case 'multi_select': {
      const selectedIds: string[] = Array.isArray(value) ? value : value ? [value] : [];
      const selectedOpts = prop.options?.filter((o) => selectedIds.includes(o.id)) || [];

      const handleCreateOption = () => {
        if (!newOptionInput.trim()) return;
        onAddOption(newOptionInput.trim());
        setNewOptionInput('');
        closePopover();
      };

      return (
        <div className="relative" ref={triggerRef}>
          <div
            onClick={() => !readOnly && togglePopover()}
            className="flex flex-wrap gap-1 items-center px-1.5 py-1 min-h-[26px] cursor-pointer hover:bg-stone-100/60 dark:hover:bg-zinc-800/60 rounded-md transition-colors"
          >
            {selectedOpts.length > 0 ? (
              selectedOpts.map((opt) => (
                <span
                  key={opt.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium"
                  style={{
                    backgroundColor: `${opt.color}20`,
                    color: opt.color,
                    border: `1px solid ${opt.color}40`,
                  }}
                >
                  {opt.name}
                </span>
              ))
            ) : (
              <span className="text-stone-400 text-xs">Select...</span>
            )}
          </div>

          <DatabasePopover
            isOpen={isPopoverOpen}
            onClose={closePopover}
            triggerRef={triggerRef}
            width={220}
          >
            <div className="p-1 space-y-2 font-sans text-left">
              <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider px-1">
                Select or create option
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1">
                {prop.options?.map((opt) => {
                  const isChecked = selectedIds.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        if (prop.type === 'multi_select') {
                          const next = isChecked ? selectedIds.filter((id) => id !== opt.id) : [...selectedIds, opt.id];
                          onChange(next);
                        } else {
                          onChange(opt.id);
                          closePopover();
                        }
                      }}
                      className={`w-full text-left px-2 py-1 rounded-md text-xs flex items-center justify-between font-medium cursor-pointer ${isChecked ? 'bg-stone-100 dark:bg-zinc-700' : 'hover:bg-stone-100 dark:hover:bg-zinc-700/60'}`}
                      style={{ color: opt.color }}
                    >
                      <span>{opt.name}</span>
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>

              {/* Inline Option Creator */}
              <div className="pt-2 border-t border-stone-100 dark:border-zinc-700 space-y-1.5">
                <input
                  type="text"
                  placeholder="New option name..."
                  value={newOptionInput}
                  onChange={(e) => setNewOptionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateOption();
                    }
                  }}
                  className="w-full px-2 py-1 text-xs border rounded-md bg-stone-50 dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#1f4d3d]"
                />
                {newOptionInput.trim() && (
                  <button
                    onClick={handleCreateOption}
                    className="w-full flex items-center gap-1.5 px-2 py-1 text-xs font-semibold bg-[#1f4d3d] text-white rounded-md hover:bg-[#183e31] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create "{newOptionInput.trim()}"</span>
                  </button>
                )}
              </div>
            </div>
          </DatabasePopover>
        </div>
      );
    }

    case 'url':
      return (
        <div className="flex items-center gap-1">
          <input
            type="url"
            defaultValue={value || ''}
            disabled={readOnly}
            onBlur={(e) => onChange(e.target.value)}
            className="w-full bg-transparent focus:bg-stone-100 dark:focus:bg-zinc-800 border-none focus:outline-none px-1.5 py-0.5 rounded text-stone-800 dark:text-zinc-200"
            placeholder="https://..."
          />
          {value && (
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
        </div>
      );

    default:
      return (
        <input
          type="text"
          defaultValue={value || ''}
          disabled={readOnly}
          onBlur={(e) => onChange(e.target.value)}
          className="w-full bg-transparent focus:bg-stone-100 dark:focus:bg-zinc-800 border-none focus:outline-none px-1.5 py-0.5 rounded text-stone-800 dark:text-zinc-200"
        />
      );
  }
}
