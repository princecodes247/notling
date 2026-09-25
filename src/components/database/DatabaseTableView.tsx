import React, { useState } from 'react';
import type { DatabaseProperty, DatabaseItem } from '~/db/schema';
import { PropertyTypeIcon } from './PropertyTypeIcon';
import { Plus, Trash2, ChevronDown, Check, ExternalLink, MoreVertical } from 'lucide-react';

interface DatabaseTableViewProps {
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  onUpdateItem: (itemId: string, updates: { title?: string; properties?: Record<string, any> }) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: () => void;
  onAddProperty: (name: string, type: string) => void;
  onDeleteProperty: (propertyId: string) => void;
  readOnly?: boolean;
}

export function DatabaseTableView({
  properties,
  items,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onAddProperty,
  onDeleteProperty,
  readOnly = false,
}: DatabaseTableViewProps) {
  const [addingProperty, setAddingProperty] = useState(false);
  const [newPropName, setNewPropName] = useState('');
  const [newPropType, setNewPropType] = useState('text');
  const [activeMenuPropId, setActiveMenuPropId] = useState<string | null>(null);

  const titleProp = properties.find((p) => p.type === 'title');
  const nonTitleProps = properties.filter((p) => p.type !== 'title');

  const handleAddPropertySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName.trim()) return;
    onAddProperty(newPropName.trim(), newPropType);
    setNewPropName('');
    setAddingProperty(false);
  };

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm text-sm">
      <table className="w-full text-left border-collapse min-w-[700px]">
        <thead>
          <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {/* Title column header */}
            <th className="py-2.5 px-3 w-64 border-r border-neutral-200 dark:border-neutral-800/60 font-semibold">
              <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                <PropertyTypeIcon type={titleProp?.type || 'title'} className="w-3.5 h-3.5 text-neutral-400" />
                <span>{titleProp?.name || 'Name'}</span>
              </div>
            </th>

            {/* Dynamic property column headers */}
            {nonTitleProps.map((prop) => (
              <th
                key={prop.id}
                className="py-2.5 px-3 min-w-[140px] border-r border-neutral-200 dark:border-neutral-800/60 font-medium relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                    <PropertyTypeIcon type={prop.type} className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{prop.name}</span>
                  </div>

                  {!readOnly && (
                    <button
                      onClick={() => setActiveMenuPropId(activeMenuPropId === prop.id ? null : prop.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-opacity"
                    >
                      <MoreVertical className="w-3.5 h-3.5 text-neutral-400" />
                    </button>
                  )}

                  {activeMenuPropId === prop.id && (
                    <div className="absolute right-2 top-8 z-20 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-lg py-1 min-w-[120px]">
                      <button
                        onClick={() => {
                          onDeleteProperty(prop.id);
                          setActiveMenuPropId(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Column
                      </button>
                    </div>
                  )}
                </div>
              </th>
            ))}

            {/* Add property column button */}
            {!readOnly && (
              <th className="py-2.5 px-3 w-12 font-normal">
                {addingProperty ? (
                  <form onSubmit={handleAddPropertySubmit} className="flex items-center gap-1 min-w-[180px]">
                    <input
                      type="text"
                      placeholder="Column name..."
                      value={newPropName}
                      onChange={(e) => setNewPropName(e.target.value)}
                      className="px-2 py-1 text-xs border rounded bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <select
                      value={newPropType}
                      onChange={(e) => setNewPropType(e.target.value)}
                      className="px-1 py-1 text-xs border rounded bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="status">Status</option>
                      <option value="select">Select</option>
                      <option value="multi_select">Tags</option>
                      <option value="date">Date</option>
                      <option value="checkbox">Checkbox</option>
                      <option value="url">URL</option>
                      <option value="email">Email</option>
                    </select>
                    <button
                      type="submit"
                      className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setAddingProperty(true)}
                    className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                    title="Add Property Column"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </th>
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800/80">
          {items.map((item) => (
            <tr key={item.id} className="group hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
              {/* Title Cell */}
              <td className="py-2 px-3 border-r border-neutral-200 dark:border-neutral-800/60 font-medium text-neutral-900 dark:text-neutral-100">
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
                    className="w-full bg-transparent border-none focus:outline-none focus:bg-white dark:focus:bg-neutral-800 px-1 py-0.5 rounded text-neutral-900 dark:text-neutral-100"
                  />

                  {!readOnly && (
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-opacity"
                      title="Delete row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </td>

              {/* Dynamic Property Cells */}
              {nonTitleProps.map((prop) => {
                const val = item.properties?.[prop.id];

                return (
                  <td key={prop.id} className="py-2 px-3 border-r border-neutral-200 dark:border-neutral-800/60">
                    <TableCellContent
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
                  </td>
                );
              })}

              {!readOnly && <td className="py-2 px-3"></td>}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add Row Button at bottom of table */}
      {!readOnly && (
        <div className="p-2 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900">
          <button
            onClick={onAddItem}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors"
          >
            <Plus className="w-4 h-4 text-neutral-400" />
            <span>New Row</span>
          </button>
        </div>
      )}
    </div>
  );
}

interface TableCellContentProps {
  prop: DatabaseProperty;
  value: any;
  onChange: (val: any) => void;
  readOnly?: boolean;
}

function TableCellContent({ prop, value, onChange, readOnly }: TableCellContentProps) {
  switch (prop.type) {
    case 'text':
      return (
        <input
          type="text"
          defaultValue={value || ''}
          disabled={readOnly}
          onBlur={(e) => onChange(e.target.value)}
          className="w-full bg-transparent focus:bg-white dark:focus:bg-neutral-800 border-none focus:outline-none px-1 py-0.5 rounded text-neutral-800 dark:text-neutral-200"
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
          className="w-full bg-transparent focus:bg-white dark:focus:bg-neutral-800 border-none focus:outline-none px-1 py-0.5 rounded text-neutral-800 dark:text-neutral-200"
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
            className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
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
          className="bg-transparent focus:bg-white dark:focus:bg-neutral-800 border-none focus:outline-none px-1 py-0.5 rounded text-xs text-neutral-800 dark:text-neutral-200"
        />
      );

    case 'select':
    case 'status': {
      const selectedOption = prop.options?.find((o) => o.id === value);

      return (
        <div className="relative inline-block w-full">
          <select
            value={value || ''}
            disabled={readOnly}
            onChange={(e) => onChange(e.target.value)}
            className="w-full appearance-none bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 border-none focus:outline-none px-2 py-1 rounded text-xs cursor-pointer font-medium"
            style={{
              color: selectedOption?.color || undefined,
            }}
          >
            <option value="" className="bg-white dark:bg-neutral-900 text-neutral-500">
              Select...
            </option>
            {prop.options?.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200">
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      );
    }

    case 'multi_select': {
      const selectedIds: string[] = Array.isArray(value) ? value : [];
      const selectedOpts = prop.options?.filter((o) => selectedIds.includes(o.id)) || [];

      return (
        <div className="flex flex-wrap gap-1 items-center px-1 py-0.5 min-h-[26px]">
          {selectedOpts.map((opt) => (
            <span
              key={opt.id}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium"
              style={{
                backgroundColor: `${opt.color}20`,
                color: opt.color,
                border: `1px solid ${opt.color}40`,
              }}
            >
              {opt.name}
            </span>
          ))}

          {!readOnly && prop.options && prop.options.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                const newIds = selectedIds.includes(e.target.value)
                  ? selectedIds.filter((id) => id !== e.target.value)
                  : [...selectedIds, e.target.value];
                onChange(newIds);
              }}
              className="bg-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-xs border-none focus:outline-none cursor-pointer"
            >
              <option value="">+ tag</option>
              {prop.options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {selectedIds.includes(opt.id) ? `✓ ${opt.name}` : opt.name}
                </option>
              ))}
            </select>
          )}
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
            className="w-full bg-transparent focus:bg-white dark:focus:bg-neutral-800 border-none focus:outline-none px-1 py-0.5 rounded text-neutral-800 dark:text-neutral-200"
            placeholder="https://..."
          />
          {value && (
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="p-1 text-blue-500 hover:text-blue-600 shrink-0"
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
          className="w-full bg-transparent focus:bg-white dark:focus:bg-neutral-800 border-none focus:outline-none px-1 py-0.5 rounded text-neutral-800 dark:text-neutral-200"
        />
      );
  }
}
