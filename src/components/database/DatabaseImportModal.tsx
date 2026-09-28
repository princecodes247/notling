import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../Modal';
import { importDatabaseData } from '~/server/databases';
import type { DatabaseProperty } from '~/db/schema';
import { parseCSVToRecords, parseJSONToRecords, inferPropertyType, type ParsedDatabaseSource } from '~/lib/importParser';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Upload01Icon,
  AlertCircleIcon,
} from '@hugeicons/core-free-icons';
import { FileSpreadsheet, FileCode, ArrowRight, Eye, RefreshCw, Check } from 'lucide-react';
import clsx from 'clsx';

interface DatabaseImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  databaseId: string;
  databaseTitle?: string;
  existingProperties: DatabaseProperty[];
}

type PropertyTypeOption = 'title' | 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url' | 'email';

const PROPERTY_TYPES: Array<{ type: PropertyTypeOption; label: string }> = [
  { type: 'text', label: 'Text' },
  { type: 'number', label: 'Number' },
  { type: 'select', label: 'Select' },
  { type: 'multi_select', label: 'Multi-select' },
  { type: 'date', label: 'Date' },
  { type: 'checkbox', label: 'Checkbox' },
  { type: 'url', label: 'URL' },
  { type: 'email', label: 'Email' },
];

interface ColumnConfig {
  columnName: string;
  target: string; // '__TITLE__' | '__NEW__' | '__SKIP__' | existingPropertyId
  newPropertyName: string;
  newPropertyType: PropertyTypeOption;
  sampleValues: string[];
}

export const DatabaseImportModal: React.FC<DatabaseImportModalProps> = ({
  isOpen,
  onClose,
  databaseId,
  databaseTitle = 'Database',
  existingProperties,
}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pasteContent, setPasteContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  // Parsed dataset state
  const [parsedData, setParsedData] = useState<ParsedDatabaseSource | null>(null);
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const resetState = () => {
    setParsedData(null);
    setColumnConfigs([]);
    setParseError(null);
    setFileName(null);
    setPasteContent('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Process raw text content into structured data & initial mappings
  const processRawData = (text: string, sourceName?: string) => {
    setParseError(null);
    if (!text || !text.trim()) {
      setParseError('The file or pasted content is empty.');
      return;
    }

    let parsed: ParsedDatabaseSource;
    const trimmed = text.trim();
    if (trimmed.startsWith('[') || (trimmed.startsWith('{') && !trimmed.includes('\n'))) {
      parsed = parseJSONToRecords(trimmed);
    } else {
      parsed = parseCSVToRecords(text);
    }

    if (!parsed || parsed.headers.length === 0 || parsed.rows.length === 0) {
      setParseError('Could not parse any tabular records. Please check your CSV/TSV or JSON format.');
      return;
    }

    setFileName(sourceName || 'Pasted Data');
    setParsedData(parsed);

    // Build initial smart column configurations
    const initialConfigs: ColumnConfig[] = parsed.headers.map((header, colIdx) => {
      const colValues = parsed.rows.map((r) => r[header]);
      const samples = colValues.filter(Boolean).slice(0, 4);
      const inferred = inferPropertyType(colValues, header);

      // 1. Check if matches existing database property
      const matchedExisting = existingProperties.find(
        (p) => p.name.toLowerCase().trim() === header.toLowerCase().trim()
      );

      let target = '__NEW__';
      let targetType: PropertyTypeOption = inferred === 'title' ? 'text' : inferred;

      if (matchedExisting) {
        target = matchedExisting.id;
      } else if (
        inferred === 'title' ||
        header.toLowerCase().includes('title') ||
        header.toLowerCase().includes('name') ||
        colIdx === 0
      ) {
        // If no title mapped yet, map first plausible title to item title
        target = '__TITLE__';
      }

      return {
        columnName: header,
        target,
        newPropertyName: header,
        newPropertyType: targetType,
        sampleValues: samples,
      };
    });

    // Ensure at least one title mapping if none is chosen
    const hasTitle = initialConfigs.some((c) => c.target === '__TITLE__');
    if (!hasTitle && initialConfigs.length > 0) {
      initialConfigs[0].target = '__TITLE__';
    }

    setColumnConfigs(initialConfigs);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processRawData(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        processRawData(content, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteContent.trim()) {
      setParseError('Please paste some CSV, TSV, or JSON data first.');
      return;
    }
    processRawData(pasteContent, 'Pasted Data');
  };

  // Update a single column configuration
  const handleUpdateConfig = (index: number, updates: Partial<ColumnConfig>) => {
    setColumnConfigs((prev) => {
      const next = [...prev];
      // If switching to __TITLE__, only one column can be __TITLE__
      if (updates.target === '__TITLE__') {
        next.forEach((cfg, idx) => {
          if (idx !== index && cfg.target === '__TITLE__') {
            cfg.target = '__NEW__';
          }
        });
      }
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!parsedData || columnConfigs.length === 0) {
        throw new Error('No data to import.');
      }

      const mappings = columnConfigs.map((cfg) => ({
        columnName: cfg.columnName,
        targetPropertyId: cfg.target,
        newPropertyName: cfg.newPropertyName,
        newPropertyType: cfg.newPropertyType,
      }));

      return await importDatabaseData({
        data: {
          databaseId,
          mappings,
          rows: parsedData.rows,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database', databaseId] });
      queryClient.invalidateQueries({ queryKey: ['databases'] });
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      handleClose();
    },
    onError: (err: any) => {
      console.error('Import error:', err);
      setParseError(err.message || 'Failed to import data into database');
    },
  });

  const validRowCount = parsedData?.rows.length || 0;
  const activeMappingsCount = columnConfigs.filter((c) => c.target !== '__SKIP__').length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center gap-2">
          <span>Import Data to {databaseTitle}</span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            CSV • TSV • JSON
          </span>
        </div>
      }
      subtitle="Import structured records, auto-detect columns, or map to existing properties."
      icon={<FileSpreadsheet className="w-4 h-4 text-amber-500" />}
      footer={
        parsedData ? (
          <div className="w-full flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={resetState}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Choose different file</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending || activeMappingsCount === 0}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {importMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing {validRowCount} rows...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Import {validRowCount} {validRowCount === 1 ? 'Record' : 'Records'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : null
      }
    >
      <div className="space-y-5">
        {/* Step 1: Upload or Paste if no data parsed yet */}
        {!parsedData ? (
          <div>
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-stone-200 dark:border-zinc-800 mb-4 pb-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('upload');
                  setParseError(null);
                }}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer',
                  activeTab === 'upload'
                    ? 'bg-stone-200 dark:bg-zinc-800 text-stone-900 dark:text-stone-100'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                )}
              >
                <HugeiconsIcon icon={Upload01Icon} size={14} />
                <span>Upload File (.csv, .tsv, .json)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('paste');
                  setParseError(null);
                }}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer',
                  activeTab === 'paste'
                    ? 'bg-stone-200 dark:bg-zinc-800 text-stone-900 dark:text-stone-100'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                )}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Paste Text / JSON</span>
              </button>
            </div>

            {/* Upload Area */}
            {activeTab === 'upload' ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={clsx(
                  'border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 select-none',
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                    : 'border-stone-300 dark:border-zinc-700 hover:border-stone-400 dark:hover:border-zinc-600 bg-stone-50/50 dark:bg-zinc-900/40'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt,.json,text/csv,text/tab-separated-values,application/json"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-2xs">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                    Click to browse or drag and drop your file here
                  </p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                    Supports CSV (comma separated), TSV (tab separated), and JSON arrays
                  </p>
                </div>
              </div>
            ) : (
              /* Paste Area */
              <div className="space-y-3">
                <textarea
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder={`Paste CSV data or JSON array here...\n\nExample CSV:\nName, Role, Status, Salary\nAlice, Engineer, Full-Time, 120000\nBob, Designer, Contractor, 95000`}
                  rows={8}
                  className="w-full font-mono text-xs p-3 rounded-xl border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handlePasteSubmit}
                    disabled={!pasteContent.trim()}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Process & Map Columns</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Parse error alert */}
            {parseError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <HugeiconsIcon icon={AlertCircleIcon} size={16} className="shrink-0" />
                <span>{parseError}</span>
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Mapping & Preview */
          <div className="space-y-5">
            {parseError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <HugeiconsIcon icon={AlertCircleIcon} size={16} className="shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Header info badge */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-100/80 dark:bg-zinc-800/60 border border-stone-200/80 dark:border-zinc-700/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate block">
                    {fileName}
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    {parsedData.totalRows} {parsedData.totalRows === 1 ? 'row' : 'rows'} detected • {columnConfigs.length} columns
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="px-2.5 py-1 rounded-md text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
              </button>
            </div>

            {/* Column Mapping Configuration */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-semibold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                    Column Mapping ({activeMappingsCount} mapped)
                  </h4>
                </div>
                <span className="text-[11px] text-stone-400">
                  Configure which database properties receive each column
                </span>
              </div>

              <div className="border border-stone-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-stone-200/60 dark:divide-zinc-800/60 max-h-72 overflow-y-auto">
                {columnConfigs.map((cfg, idx) => {
                  const isTitle = cfg.target === '__TITLE__';
                  const isNew = cfg.target === '__NEW__';
                  const isSkip = cfg.target === '__SKIP__';

                  return (
                    <div
                      key={cfg.columnName}
                      className={clsx(
                        'p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors',
                        isSkip
                          ? 'bg-stone-50/50 dark:bg-zinc-900/30 opacity-60'
                          : 'bg-white dark:bg-zinc-900/80 hover:bg-stone-50/80 dark:hover:bg-zinc-800/40'
                      )}
                    >
                      {/* Left: Source Column details & samples */}
                      <div className="min-w-0 sm:w-5/12">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                            {cfg.columnName}
                          </span>
                          {isTitle && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              TITLE
                            </span>
                          )}
                        </div>
                        {cfg.sampleValues.length > 0 && (
                          <div className="text-[10px] text-stone-400 dark:text-stone-500 truncate mt-0.5">
                            Sample: {cfg.sampleValues.join(', ')}
                          </div>
                        )}
                      </div>

                      {/* Middle: Arrow indicator */}
                      <div className="hidden sm:flex items-center text-stone-300 dark:text-zinc-600 shrink-0">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>

                      {/* Right: Target Mapping Selector */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:w-6/12 justify-end">
                        <select
                          value={cfg.target}
                          onChange={(e) => handleUpdateConfig(idx, { target: e.target.value })}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer min-w-36"
                        >
                          <option value="__TITLE__">Item Title</option>
                          <option value="__NEW__">Create as New Property</option>
                          <optgroup label="Map to Existing Property">
                            {existingProperties.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.type})
                              </option>
                            ))}
                          </optgroup>
                          <option value="__SKIP__">Skip this column</option>
                        </select>

                        {/* If creating new property, show type selector and name */}
                        {isNew && (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={cfg.newPropertyName}
                              onChange={(e) =>
                                handleUpdateConfig(idx, { newPropertyName: e.target.value })
                              }
                              placeholder="Property Name"
                              className="text-xs px-2 py-1.5 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-28"
                            />

                            <select
                              value={cfg.newPropertyType}
                              onChange={(e) =>
                                handleUpdateConfig(idx, {
                                  newPropertyType: e.target.value as PropertyTypeOption,
                                })
                              }
                              className="text-xs px-2 py-1.5 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            >
                              {PROPERTY_TYPES.map((t) => (
                                <option key={t.type} value={t.type}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Data Preview */}
            {showPreview && (
              <div className="border border-stone-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-stone-50 dark:bg-zinc-800/60 border-b border-stone-200 dark:border-zinc-800 flex items-center justify-between text-xs text-stone-500">
                  <span className="font-medium">Data Preview (First 5 rows)</span>
                  <span>{parsedData.rows.length} total rows</span>
                </div>

                <div className="overflow-x-auto max-h-48 overflow-y-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-100/60 dark:bg-zinc-800/40 text-stone-700 dark:text-zinc-300 font-medium">
                        <th className="p-2 border-b border-r border-stone-200 dark:border-zinc-800 text-center w-10">
                          #
                        </th>
                        {columnConfigs.map((cfg) => (
                          <th
                            key={cfg.columnName}
                            className={clsx(
                              'p-2 border-b border-r border-stone-200 dark:border-zinc-800 whitespace-nowrap',
                              cfg.target === '__SKIP__' && 'opacity-40'
                            )}
                          >
                            <div className="flex items-center gap-1.5">
                              <span>{cfg.columnName}</span>
                              {cfg.target === '__TITLE__' && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                  Title
                                </span>
                              )}
                              {cfg.target === '__SKIP__' && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-stone-200 dark:bg-zinc-700 text-stone-500">
                                  Skip
                                </span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200/60 dark:divide-zinc-800/60 font-mono text-[11px]">
                      {parsedData.rows.slice(0, 5).map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className="hover:bg-stone-50/60 dark:hover:bg-zinc-800/20 transition-colors"
                        >
                          <td className="p-2 border-r border-stone-200 dark:border-zinc-800 text-center text-stone-400">
                            {rowIdx + 1}
                          </td>
                          {columnConfigs.map((cfg) => (
                            <td
                              key={cfg.columnName}
                              className={clsx(
                                'p-2 border-r border-stone-200 dark:border-zinc-800 max-w-44 truncate',
                                cfg.target === '__SKIP__' && 'opacity-40 text-stone-400'
                              )}
                            >
                              {row[cfg.columnName] !== undefined && row[cfg.columnName] !== ''
                                ? String(row[cfg.columnName])
                                : <span className="text-stone-300 dark:text-zinc-600">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
