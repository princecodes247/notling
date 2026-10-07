import React, { useState } from 'react';
import { Modal } from './Modal';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Download01Icon,
  File01Icon,
  CheckmarkCircle01Icon,
  TableIcon,
} from '@hugeicons/core-free-icons';
import { FileSpreadsheet, FileCode } from 'lucide-react';
import type { Page } from '~/db/schema';
import {
  exportPageToMarkdown,
  exportPageToPDF,
  exportDatabaseToCSV,
  exportDatabaseToJSON,
  exportDatabaseToMarkdownTable,
  exportDatabaseToPDF,
  type ExportablePage,
} from '~/lib/pageExport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  page?: Page | ExportablePage | null;
  isDatabase?: boolean;
  databaseData?: { database: { id?: string; title?: string | null; icon?: string | null }; properties?: any[]; items?: any[]; totalCount?: number; relatedItems?: Record<string, { title: string }> } | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  page,
  isDatabase = false,
  databaseData,
}) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!page && !databaseData) return null;

  const targetTitle =
    (databaseData?.database?.title || page?.title || 'Untitled').trim() || 'Untitled';

  const getFullDatabaseData = async () => {
    if (!databaseData) return null;
    const dbId = databaseData.database?.id;
    const currentItems = databaseData.items || [];
    const total = databaseData.totalCount ?? currentItems.length;

    if (!dbId || currentItems.length >= total) {
      return databaseData;
    }

    try {
      setIsExporting(true);
      const { getDatabaseItems } = await import('~/server/databases');
      const res = await getDatabaseItems({
        data: {
          databaseId: dbId,
          limit: Math.max(total, 5000),
          offset: 0,
        },
      });

      if (res?.items) {
        return {
          ...databaseData,
          items: res.items,
          relatedItems: {
            ...databaseData.relatedItems,
            ...(res.relatedItems || {}),
          },
        };
      }
    } catch (err) {
      console.warn('Failed to fetch full items for export, falling back to loaded items:', err);
    } finally {
      setIsExporting(false);
    }

    return databaseData;
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const data = await getFullDatabaseData();
      if (data) {
        exportDatabaseToCSV(data);
        setSuccessMessage(`Exported "${targetTitle}" as CSV Spreadsheet (.csv)`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to export CSV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      setIsExporting(true);
      const data = await getFullDatabaseData();
      if (data) {
        exportDatabaseToJSON(data);
        setSuccessMessage(`Exported "${targetTitle}" as JSON (.json)`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to export JSON:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMarkdown = async () => {
    try {
      setIsExporting(true);
      if (isDatabase && databaseData) {
        const data = await getFullDatabaseData();
        if (data) {
          exportDatabaseToMarkdownTable(data);
          setSuccessMessage(`Exported "${targetTitle}" as Markdown Table (.md)`);
        }
      } else if (page) {
        exportPageToMarkdown(page);
        setSuccessMessage(`Exported "${targetTitle}" as Markdown (.md)`);
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to export markdown:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      if (isDatabase && databaseData) {
        const data = await getFullDatabaseData();
        if (data) {
          await exportDatabaseToPDF(data);
          setSuccessMessage(`Exported "${targetTitle}" as PDF (.pdf)`);
          setTimeout(() => setSuccessMessage(null), 3000);
        }
      } else if (page) {
        await exportPageToPDF(page);
        setSuccessMessage(`Exported "${targetTitle}" as PDF (.pdf)`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Export "${targetTitle}"`}
      maxWidth={isDatabase ? 'lg' : 'md'}
      icon={isDatabase ? <HugeiconsIcon icon={TableIcon} size={16} /> : <HugeiconsIcon icon={File01Icon} size={16} />}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-5 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-100 text-xs font-semibold tracking-tight shadow-xs hover:shadow-sm active:scale-95 transition-all flex items-center justify-center cursor-pointer"
        >
          Done
        </button>
      }
    >
      <div className="flex flex-col gap-4 select-none text-stone-900 dark:text-stone-100">
        {successMessage && (
          <div className="px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2 animate-in fade-in">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {isDatabase && databaseData && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/80 dark:border-zinc-700/80 text-xs">
            <span className="text-stone-600 dark:text-zinc-400 font-medium">
              Database contents
            </span>
            <span className="font-semibold text-stone-800 dark:text-zinc-200">
              {databaseData.totalCount ?? databaseData.items?.length ?? 0} records • {databaseData.properties?.length ?? 0} columns
            </span>
          </div>
        )}

        {isExporting && (
          <div className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300 font-medium flex items-center gap-2 animate-in fade-in">
            <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
            <span>Preparing export data...</span>
          </div>
        )}

        {isDatabase ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* CSV Card - Default & Recommended */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="group p-4 rounded-xl border-2 border-blue-500/40 hover:border-blue-600 hover:shadow-md bg-blue-50/20 dark:bg-blue-950/20 hover:bg-blue-50/40 dark:hover:bg-blue-900/30 text-left flex flex-col gap-2.5 transition-all cursor-pointer active:scale-98"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white">
                    DEFAULT
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                    .csv
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  CSV Spreadsheet
                </span>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
                  Standard comma-separated table format. Compatible with Excel, Google Sheets, and Notion.
                </p>
              </div>

              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                <HugeiconsIcon icon={Download01Icon} size={13} />
                <span>Download .csv</span>
              </div>
            </button>

            {/* JSON Card */}
            <button
              type="button"
              onClick={handleExportJSON}
              className="group p-4 rounded-xl border border-stone-200/90 dark:border-stone-800 hover:border-stone-800 dark:hover:border-stone-600 hover:shadow-md bg-white dark:bg-[#222226] hover:bg-stone-50/50 dark:hover:bg-stone-800/50 text-left flex flex-col gap-2.5 transition-all cursor-pointer active:scale-98"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 group-hover:bg-stone-900 dark:group-hover:bg-stone-700 text-stone-700 dark:text-stone-300 group-hover:text-white flex items-center justify-center transition-colors">
                  <FileCode className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 group-hover:bg-stone-200 transition-colors">
                  .json
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  JSON Records
                </span>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
                  Raw structured records and column definitions for developers and data analysis.
                </p>
              </div>

              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200 group-hover:text-stone-950 dark:group-hover:text-white">
                <HugeiconsIcon icon={Download01Icon} size={13} />
                <span>Download .json</span>
              </div>
            </button>

            {/* Markdown Table Card */}
            <button
              type="button"
              onClick={handleExportMarkdown}
              className="group p-4 rounded-xl border border-stone-200/90 dark:border-stone-800 hover:border-stone-800 dark:hover:border-stone-600 hover:shadow-md bg-white dark:bg-[#222226] hover:bg-stone-50/50 dark:hover:bg-stone-800/50 text-left flex flex-col gap-2.5 transition-all cursor-pointer active:scale-98"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 group-hover:bg-stone-900 dark:group-hover:bg-stone-700 text-stone-700 dark:text-stone-300 group-hover:text-white flex items-center justify-center transition-colors">
                  <HugeiconsIcon icon={File01Icon} size={16} />
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 group-hover:bg-stone-200 transition-colors">
                  .md
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Markdown Table
                </span>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
                  GitHub-flavored Markdown table for documentation and README files.
                </p>
              </div>

              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200 group-hover:text-stone-950 dark:group-hover:text-white">
                <HugeiconsIcon icon={Download01Icon} size={13} />
                <span>Download .md</span>
              </div>
            </button>

            {/* PDF Card */}
            <button
              type="button"
              onClick={handleExportPDF}
              className="group p-4 rounded-xl border border-stone-200/90 dark:border-stone-800 hover:border-stone-800 dark:hover:border-stone-600 hover:shadow-md bg-white dark:bg-[#222226] hover:bg-stone-50/50 dark:hover:bg-stone-800/50 text-left flex flex-col gap-2.5 transition-all cursor-pointer active:scale-98"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 group-hover:bg-stone-900 dark:group-hover:bg-stone-700 text-stone-700 dark:text-stone-300 group-hover:text-white flex items-center justify-center transition-colors">
                  <HugeiconsIcon icon={Download01Icon} size={16} />
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 group-hover:bg-stone-200 transition-colors">
                  .pdf
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  PDF Document
                </span>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
                  Clean styled document layout with table formatting and metadata.
                </p>
              </div>

              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200 group-hover:text-stone-950 dark:group-hover:text-white">
                <HugeiconsIcon icon={Download01Icon} size={13} />
                <span>Download .pdf</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Markdown Card */}
            <button
              type="button"
              onClick={handleExportMarkdown}
              className="group p-4 rounded-xl border border-stone-200/90 dark:border-stone-800 hover:border-stone-800 dark:hover:border-stone-600 hover:shadow-md bg-white dark:bg-[#222226] hover:bg-stone-50/50 dark:hover:bg-stone-800/50 text-left flex flex-col gap-2.5 transition-all cursor-pointer active:scale-98"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 group-hover:bg-stone-900 dark:group-hover:bg-stone-700 text-stone-700 dark:text-stone-300 group-hover:text-white flex items-center justify-center transition-colors">
                  <HugeiconsIcon icon={File01Icon} size={16} />
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 group-hover:bg-stone-200 transition-colors">
                  .md
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 group-hover:text-black dark:group-hover:text-white">
                  Markdown
                </span>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
                  Download as GitHub-Flavored Markdown for Notion, GitHub, or static site generators.
                </p>
              </div>

              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200 group-hover:text-stone-950 dark:group-hover:text-white">
                <HugeiconsIcon icon={Download01Icon} size={13} />
                <span>Download .md</span>
              </div>
            </button>

            {/* PDF Card */}
            <button
              type="button"
              onClick={handleExportPDF}
              className="group p-4 rounded-xl border border-stone-200/90 dark:border-stone-800 hover:border-stone-800 dark:hover:border-stone-600 hover:shadow-md bg-white dark:bg-[#222226] hover:bg-stone-50/50 dark:hover:bg-stone-800/50 text-left flex flex-col gap-2.5 transition-all cursor-pointer active:scale-98"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 group-hover:bg-stone-900 dark:group-hover:bg-stone-700 text-stone-700 dark:text-stone-300 group-hover:text-white flex items-center justify-center transition-colors">
                  <HugeiconsIcon icon={Download01Icon} size={16} />
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 group-hover:bg-stone-200 transition-colors">
                  .pdf
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 group-hover:text-black dark:group-hover:text-white">
                  PDF Document
                </span>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
                  Clean formatted document layout ready for download as PDF.
                </p>
              </div>

              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200 group-hover:text-stone-950 dark:group-hover:text-white">
                <HugeiconsIcon icon={Download01Icon} size={13} />
                <span>Download .pdf</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

