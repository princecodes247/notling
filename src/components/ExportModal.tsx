import React, { useState } from 'react';
import { Modal } from './Modal';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Download01Icon,
  File01Icon,
  PrinterIcon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons';
import type { Page } from '~/db/schema';
import { exportPageToMarkdown, exportPageToPDF, type ExportablePage } from '~/lib/pageExport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  page?: Page | ExportablePage | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  page,
}) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!page) return null;

  const pageTitle = page.title || 'Untitled Document';

  const handleExportMarkdown = () => {
    try {
      exportPageToMarkdown(page);
      setSuccessMessage(`Exported "${pageTitle}" as Markdown (.md)`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to export markdown:', err);
    }
  };

  const handleExportPDF = () => {
    try {
      exportPageToPDF(page);
      setSuccessMessage(`Opened print preview for PDF export`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Export "${pageTitle}"`}
      maxWidth="md"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold tracking-tight shadow-xs hover:shadow-sm active:scale-95 transition-all flex items-center justify-center cursor-pointer"
        >
          Done
        </button>
      }
    >
      <div className="flex flex-col gap-4 select-none text-stone-900">


        {successMessage && (
          <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium flex items-center gap-2 animate-in fade-in">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={15} className="text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Markdown Card */}
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="group p-4 rounded-xl border border-stone-200/90 hover:border-stone-800 hover:shadow-md bg-white hover:bg-stone-50/50 text-left flex flex-col gap-2.5 transition-all cursor-pointer active:scale-98"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-stone-900 text-stone-700 group-hover:text-white flex items-center justify-center transition-colors">
                <HugeiconsIcon icon={File01Icon} size={16} />
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-600 group-hover:bg-stone-200 transition-colors">
                .md
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-stone-900 group-hover:text-black">
                Markdown
              </span>
              <p className="text-[11px] text-stone-500 leading-snug">
                Download as GitHub-Flavored Markdown for Notion, GitHub, or static site generators.
              </p>
            </div>

            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-stone-800 group-hover:text-stone-950">
              <HugeiconsIcon icon={Download01Icon} size={13} />
              <span>Download .md</span>
            </div>
          </button>

          {/* PDF Card */}
          <button
            type="button"
            onClick={handleExportPDF}
            className="group p-4 rounded-xl border border-stone-200/90 hover:border-stone-800 hover:shadow-md bg-white hover:bg-stone-50/50 text-left flex flex-col gap-2.5 transition-all cursor-pointer active:scale-98"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-stone-900 text-stone-700 group-hover:text-white flex items-center justify-center transition-colors">
                <HugeiconsIcon icon={PrinterIcon} size={16} />
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-600 group-hover:bg-stone-200 transition-colors">
                .pdf
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-stone-900 group-hover:text-black">
                PDF Document
              </span>
              <p className="text-[11px] text-stone-500 leading-snug">
                Formatted document layout ready for printing or saving as PDF.
              </p>
            </div>

            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-stone-800 group-hover:text-stone-950">
              <HugeiconsIcon icon={PrinterIcon} size={13} />
              <span>Export as PDF</span>
            </div>
          </button>
        </div>
      </div>
    </Modal>
  );
};
