import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, Loader2, FolderInput } from 'lucide-react';
import { useUIStore } from '~/store/uiStore';
import { useQueryClient } from '@tanstack/react-query';
import { parseNotionZipArchive, parseMarkdownToBlocks, parseHTMLToBlocks, extractTitleFromContent, cleanNotionTitle, type ImportedDoc } from '~/lib/importParser';
import { createPage, updatePageContent } from '~/server/pages';
import { useNavigate } from '@tanstack/react-router';
import { Modal } from './Modal';

interface ImportModalProps {
  workspaceId: string;
  onSelectPage?: (pageId: string) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ workspaceId, onSelectPage }) => {
  const { isImportOpen, setImportOpen } = useUIStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isDragOver, setIsDragOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    if (isImporting) return;
    setImportOpen(false);
    setErrorMsg(null);
    setProgressText('');
    setImportedCount(0);
    setTotalCount(0);
  };

  const processImportDocs = async (docs: ImportedDoc[]) => {
    if (!workspaceId || docs.length === 0) {
      setErrorMsg('No valid documents found to import.');
      setIsImporting(false);
      return;
    }

    setTotalCount(docs.length);
    setImportedCount(0);

    // Track created folder IDs by relative path to maintain parent-child hierarchy
    const pathToIdMap = new Map<string, string>();
    let firstCreatedPageId: string | null = null;

    try {
      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        setImportedCount(i + 1);
        setProgressText(`Importing document ${i + 1} of ${docs.length}: "${doc.title}"...`);

        // Find parent page ID if relative parent path exists in path map
        let parentId: string | null = null;
        if (doc.parentPath && pathToIdMap.has(doc.parentPath)) {
          parentId = pathToIdMap.get(doc.parentPath) || null;
        }

        // Create new page in workspace
        const newPage = await createPage({
          data: {
            workspaceId,
            parentId,
            title: doc.title,
            icon: doc.icon || '📄',
          },
        });

        if (newPage) {
          if (!firstCreatedPageId) {
            firstCreatedPageId = newPage.id;
          }

          // Register relativePath in path map for potential child documents
          pathToIdMap.set(doc.relativePath, newPage.id);

          // Remove trailing filename from relative path to register folder path
          const pathParts = doc.relativePath.split('/');
          pathParts.pop();
          if (pathParts.length > 0) {
            const folderPath = pathParts.join('/');
            if (!pathToIdMap.has(folderPath)) {
              pathToIdMap.set(folderPath, newPage.id);
            }
          }

          // Update page with imported BlockNote blocks
          if (doc.contentBlocks && doc.contentBlocks.length > 0) {
            const contentText = doc.title;
            await updatePageContent({
              data: {
                pageId: newPage.id,
                content: doc.contentBlocks,
                contentText,
              },
            });
          }
        }
      }

      setProgressText(`Successfully imported ${docs.length} ${docs.length === 1 ? 'page' : 'pages'}!`);

      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      queryClient.invalidateQueries({ queryKey: ['pages'] });

      setTimeout(() => {
        setIsImporting(false);
        setImportOpen(false);
        if (firstCreatedPageId) {
          if (onSelectPage) {
            onSelectPage(firstCreatedPageId);
          } else {
            navigate({ to: '/dashboard/p/$pageId', params: { pageId: firstCreatedPageId } });
          }
        }
      }, 900);
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMsg(err?.message || 'Failed to import documents. Please try again.');
      setIsImporting(false);
    }
  };

  const handleFileSelect = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsImporting(true);
    setErrorMsg(null);

    const firstFile = files[0];
    const lowerName = firstFile.name.toLowerCase();

    try {
      if (lowerName.endsWith('.zip')) {
        setProgressText('Extracting and reading Notion archive...');
        const docs = await parseNotionZipArchive(firstFile);
        await processImportDocs(docs);
      } else {
        const docs: ImportedDoc[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const name = file.name;
          const lower = name.toLowerCase();

          if (lower.endsWith('.md') || lower.endsWith('.txt')) {
            const text = await file.text();
            const { title, bodyMarkdown } = extractTitleFromContent(text, name);
            const blocks = parseMarkdownToBlocks(bodyMarkdown);
            docs.push({
              title,
              icon: '📄',
              contentBlocks: blocks,
              relativePath: name,
            });
          } else if (lower.endsWith('.html') || lower.endsWith('.htm')) {
            const html = await file.text();
            const title = cleanNotionTitle(name);
            const blocks = parseHTMLToBlocks(html);
            docs.push({
              title,
              icon: '📄',
              contentBlocks: blocks,
              relativePath: name,
            });
          }
        }
        await processImportDocs(docs);
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMsg('Could not parse uploaded files. Ensure valid .zip, .md, or .html files.');
      setIsImporting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  return (
    <Modal
      isOpen={isImportOpen}
      onClose={handleClose}
      title="Import Notes & Documents"
      subtitle="Notion (.zip), Apple Notes (.html), Markdown (.md), or Text (.txt)"
      icon={<FolderInput className="w-4 h-4 text-stone-700 dark:text-zinc-300" />}
      maxWidth="lg"
    >
      <div className="flex flex-col gap-4 select-none">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 text-rose-800 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isImporting ? (
          <div className="py-8 px-4 border border-stone-200/80 dark:border-zinc-800 rounded-xl bg-stone-50/70 dark:bg-zinc-900/40 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-8 h-8 text-stone-800 dark:text-zinc-200 animate-spin" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
                Importing your content...
              </span>
              <span className="text-xs text-stone-500 dark:text-zinc-400 max-w-sm leading-relaxed font-mono">
                {progressText}
              </span>
            </div>
            {totalCount > 0 && (
              <div className="w-full max-w-xs bg-stone-200/80 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-stone-900 dark:bg-white h-full transition-all duration-300"
                  style={{ width: `${Math.round((importedCount / totalCount) * 100)}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
              isDragOver
                ? 'border-stone-800 dark:border-zinc-400 bg-stone-100/80 dark:bg-zinc-800/80 ring-2 ring-stone-400 dark:ring-zinc-500'
                : 'border-stone-300 dark:border-zinc-700 hover:border-stone-400 dark:hover:border-zinc-600 bg-stone-50/50 dark:bg-zinc-900/40 hover:bg-stone-100/50 dark:hover:bg-zinc-800/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".zip,.md,.txt,.html,.htm"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-stone-200/90 dark:border-zinc-700 flex items-center justify-center shadow-2xs text-stone-600 dark:text-zinc-300">
              <Upload className="w-6 h-6 stroke-1.5" />
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-xs font-semibold text-stone-900 dark:text-zinc-100">
                Click to browse or drag & drop files here
              </span>
              <span className="text-[11px] text-stone-400 dark:text-zinc-500 max-w-xs leading-normal">
                Supports Notion workspace exports (<code className="font-mono text-stone-600 dark:text-zinc-300">.zip</code>), Apple Notes (<code className="font-mono text-stone-600 dark:text-zinc-300">.html</code>), and Markdown (<code className="font-mono text-stone-600 dark:text-zinc-300">.md</code>)
              </span>
            </div>
          </div>
        )}

        {/* Supported Format Guide Badges */}
        <div className="pt-2 border-t border-stone-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-stone-400 dark:text-zinc-500 font-mono">
          <span>Supported formats:</span>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 font-semibold border border-stone-200/60 dark:border-zinc-700">Notion .zip</span>
            <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 font-semibold border border-stone-200/60 dark:border-zinc-700">Apple Notes .html</span>
            <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 font-semibold border border-stone-200/60 dark:border-zinc-700">Markdown .md</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
