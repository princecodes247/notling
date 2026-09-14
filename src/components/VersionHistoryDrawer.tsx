import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Clock01Icon,
  Cancel01Icon,
  RotateLeftIcon,
  ViewIcon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons';
import { getPageHistory, restorePageVersion } from '~/server/pages';
import { UserAvatar } from '~/components/UserAvatar';
import { Modal } from '~/components/Modal';
import type { PageHistory } from '~/db/schema';

interface VersionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  onVersionRestored?: (restoredPage: any) => void;
}

function formatRelativeTime(dateInput?: string | Date | null): string {
  if (!dateInput) return 'Just now';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function extractTextSummaryFromBlocks(blocks: any[]): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return 'Empty document';
  let text = '';
  for (const block of blocks) {
    if (block.content && Array.isArray(block.content)) {
      for (const item of block.content) {
        if (item.text) text += item.text + ' ';
      }
    }
  }
  const clean = text.trim();
  if (!clean) return `${blocks.length} block${blocks.length > 1 ? 's' : ''}`;
  return clean.length > 90 ? clean.slice(0, 90) + '...' : clean;
}

export const VersionHistoryDrawer: React.FC<VersionHistoryDrawerProps> = ({
  isOpen,
  onClose,
  pageId,
  onVersionRestored,
}) => {
  const queryClient = useQueryClient();
  const [previewItem, setPreviewItem] = useState<PageHistory | null>(null);
  const [restoredSuccess, setRestoredSuccess] = useState<string | null>(null);

  const { data: historyItems = [], isLoading } = useQuery({
    queryKey: ['pageHistory', pageId],
    queryFn: async () => {
      if (!pageId) return [];
      return await getPageHistory({ data: pageId });
    },
    enabled: isOpen && !!pageId,
    refetchInterval: isOpen ? 4000 : false,
  });

  const restoreMutation = useMutation({
    mutationFn: async (historyId: string) => {
      return await restorePageVersion({ data: historyId });
    },
    onSuccess: (updatedPage) => {
      queryClient.invalidateQueries({ queryKey: ['page', pageId] });
      queryClient.invalidateQueries({ queryKey: ['publicPage', pageId] });
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      queryClient.invalidateQueries({ queryKey: ['pageHistory', pageId] });

      setRestoredSuccess('Document version restored successfully.');
      setTimeout(() => setRestoredSuccess(null), 3500);

      if (updatedPage && onVersionRestored) {
        onVersionRestored(updatedPage);
      }
    },
  });

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/30 dark:bg-black/50 backdrop-blur-xs z-40 transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-over Drawer Container */}
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-[#18181b] border-l border-stone-200/80 dark:border-zinc-800 shadow-2xl flex flex-col font-sans select-none animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="h-14 px-5 border-b border-stone-100 dark:border-zinc-800 flex items-center justify-between bg-stone-50/60 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-brand-light dark:bg-stone-800 text-brand-text dark:text-zinc-200">
              <HugeiconsIcon icon={Clock01Icon} size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-zinc-100 tracking-tight">
                Version History
              </h2>
              <p className="text-[11px] text-stone-400 dark:text-zinc-500">
                Track changes & who edited this page
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 dark:text-zinc-500 hover:text-stone-800 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        {/* Success Banner */}
        {restoredSuccess && (
          <div className="mx-4 mt-3 px-3.5 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{restoredSuccess}</span>
          </div>
        )}

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-stone-400 dark:text-zinc-500 text-xs">
              <div className="w-4 h-4 rounded-full border-2 border-brand-bg border-t-transparent animate-spin" />
              <span>Loading version history...</span>
            </div>
          ) : historyItems.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-zinc-800 text-stone-400 dark:text-zinc-500 flex items-center justify-center mb-3">
                <HugeiconsIcon icon={Clock01Icon} size={22} />
              </div>
              <span className="text-xs font-semibold text-stone-800 dark:text-zinc-200">
                No change history recorded yet
              </span>
              <p className="text-[11px] text-stone-400 dark:text-zinc-500 max-w-xs mt-1 leading-relaxed">
                As you and your collaborators edit this page, automatic version snapshots will appear here.
              </p>
            </div>
          ) : (
            <div className="relative pl-4 border-l-2 border-stone-100 dark:border-zinc-800/80 flex flex-col gap-4 my-1">
              {historyItems.map((item, idx) => (
                <div key={item.id} className="relative group">
                  {/* Timeline Dot */}
                  <span
                    className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 bg-white dark:bg-zinc-900 ${
                      idx === 0
                        ? 'border-brand-bg bg-brand-bg shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                        : 'border-stone-300 dark:border-zinc-700'
                    }`}
                  />

                  {/* Entry Card */}
                  <div className="p-3 rounded-xl border border-stone-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-stone-300 dark:hover:border-zinc-700 hover:shadow-2xs transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserAvatar
                          avatarUrl={item.userAvatarUrl}
                          email={item.userEmail || 'Guest'}
                          name={item.userName}
                          size={22}
                          className="w-5.5 h-5.5 shrink-0"
                        />
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-semibold text-stone-800 dark:text-zinc-200 truncate">
                            {item.userName || item.userEmail || 'Guest user'}
                          </span>
                          {idx === 0 && (
                            <span className="text-[9.5px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800">
                              Current
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-[10.5px] font-medium text-stone-400 dark:text-zinc-500 shrink-0">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-stone-700 dark:text-zinc-300 truncate">
                      {item.changeSummary || item.title || 'Updated page'}
                    </div>

                    <div className="text-[11px] text-stone-400 dark:text-zinc-500 line-clamp-2 bg-stone-50/80 dark:bg-zinc-800/40 p-2 rounded-lg font-mono">
                      {extractTextSummaryFromBlocks(item.content as any[])}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setPreviewItem(item)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-300 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        <HugeiconsIcon icon={ViewIcon} size={12} />
                        <span>Preview</span>
                      </button>

                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => restoreMutation.mutate(item.id)}
                          disabled={restoreMutation.isPending}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-bg hover:bg-brand-hover text-brand-fg text-[11px] font-medium transition-all cursor-pointer shadow-2xs active:scale-98"
                        >
                          <HugeiconsIcon icon={RotateLeftIcon} size={12} />
                          <span>{restoreMutation.isPending ? 'Restoring...' : 'Restore'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Snapshot Preview Modal */}
      {previewItem && (
        <Modal
          isOpen={!!previewItem}
          onClose={() => setPreviewItem(null)}
          title={`Snapshot: ${previewItem.title || 'Untitled'}`}
          subtitle={`Saved ${formatRelativeTime(previewItem.createdAt)} by ${previewItem.userName || previewItem.userEmail || 'Guest'}`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-stone-400">
                {Array.isArray(previewItem.content) ? `${previewItem.content.length} blocks` : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-stone-200 dark:border-zinc-700 text-xs text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    restoreMutation.mutate(previewItem.id);
                    setPreviewItem(null);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-brand-bg hover:bg-brand-hover text-brand-fg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  Restore this version
                </button>
              </div>
            </div>
          }
        >
          <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto p-1 font-sans select-text">
            <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
              {previewItem.title || 'Untitled Document'}
            </h1>

            <div className="p-4 rounded-xl border border-stone-200/80 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-900/40 text-xs text-stone-800 dark:text-zinc-200 leading-relaxed font-mono whitespace-pre-wrap">
              {extractTextSummaryFromBlocks(previewItem.content as any[]) || 'Empty document.'}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
