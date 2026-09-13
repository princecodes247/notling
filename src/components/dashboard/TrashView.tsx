import React, { useState } from 'react';
import { Trash2, RotateCcw, Search, Clock } from 'lucide-react';
import { ConfirmModal } from '~/components/ConfirmModal';

interface TrashedPageItem {
  id: string;
  title: string;
  icon?: string | null;
  deletedAt?: Date | string | null;
}

interface TrashViewProps {
  trashPages: TrashedPageItem[];
  onRestore: (pageId: string) => void;
  onRestoreAll: () => void;
  onPermanentDelete: (pageId: string) => void;
  onEmptyTrash: () => void;
  onSelectPage?: (pageId: string) => void;
}

export const TrashView: React.FC<TrashViewProps> = ({
  trashPages = [],
  onRestore,
  onRestoreAll,
  onPermanentDelete,
  onEmptyTrash,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    onConfirm: () => void;
  } | null>(null);

  const filteredTrash = trashPages.filter((item) =>
    (item.title || 'Untitled').toLowerCase().includes(filterQuery.toLowerCase())
  );

  const promptPermanentDelete = (page: TrashedPageItem) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Permanently delete document?',
      description: `"${page.title || 'Untitled Document'}" will be deleted permanently along with all its blocks and content. This action cannot be undone.`,
      confirmText: 'Delete permanently',
      onConfirm: () => {
        onPermanentDelete(page.id);
        setConfirmConfig(null);
      },
    });
  };

  const promptEmptyTrash = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Empty entire trash?',
      description: `Are you sure you want to permanently delete all ${trashPages.length} item(s) in Trash? All content will be destroyed permanently. This action cannot be undone.`,
      confirmText: 'Empty trash permanently',
      onConfirm: () => {
        onEmptyTrash();
        setConfirmConfig(null);
      },
    });
  };

  return (
    <div className="flex-1 w-full h-full bg-white dark:bg-[#18181b] text-stone-900 dark:text-zinc-100 overflow-y-auto select-none p-4 sm:p-10 pb-6 sm:pb-10 pt-safe font-sans">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200/70 dark:border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-normal text-stone-950 dark:text-white tracking-tight">
                  Trash
                </h1>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700">
                  {trashPages.length} {trashPages.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-zinc-400 mt-1">
                Pages in trash can be restored anytime or deleted permanently.
              </p>
            </div>
          </div>

          {/* Top Actions */}
          {trashPages.length > 0 && (
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onRestoreAll}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-stone-200/90 dark:border-zinc-700/80 hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-800 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-stone-600 dark:text-zinc-400" />
                <span>Restore All</span>
              </button>
              <button
                type="button"
                onClick={promptEmptyTrash}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer active:scale-98"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Empty Trash</span>
              </button>
            </div>
          )}
        </div>

        {/* Search & Filter Bar */}
        {trashPages.length > 0 && (
          <div className="relative">
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-stone-50 dark:bg-zinc-900/80 border border-stone-200/80 dark:border-zinc-700/80 focus-within:border-stone-400 dark:focus-within:border-zinc-500 focus-within:bg-white dark:focus-within:bg-zinc-900 transition-colors">
              <Search className="w-4 h-4 text-stone-400 dark:text-zinc-500 shrink-0" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter trashed documents..."
                className="w-full bg-transparent text-xs text-stone-900 dark:text-zinc-100 placeholder-stone-400 dark:placeholder-zinc-500 focus:outline-none font-medium"
              />
              {filterQuery && (
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  className="text-[11px] text-stone-400 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-300"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Trashed Items List */}
        <div className="flex flex-col gap-3">
          {trashPages.length === 0 ? (
            <div className="py-20 border border-dashed border-stone-200 dark:border-zinc-800 rounded-xl flex flex-col items-center justify-center text-center p-8 gap-3 text-stone-400 dark:text-zinc-500 bg-stone-50/40 dark:bg-zinc-900/40">
              <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-zinc-800 text-stone-400 dark:text-zinc-400 flex items-center justify-center">
                <Trash2 className="w-6 h-6 stroke-1" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-stone-700 dark:text-zinc-300">Trash is empty</span>
                <span className="text-xs text-stone-400 dark:text-zinc-500">Pages you delete in your workspace will appear here.</span>
              </div>
            </div>
          ) : filteredTrash.length === 0 ? (
            <div className="py-12 border border-dashed border-stone-200 dark:border-zinc-800 rounded-xl text-center text-xs text-stone-400 dark:text-zinc-500 p-6">
              No trashed pages match "{filterQuery}"
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-stone-100 dark:divide-zinc-800/80 rounded-xl border border-stone-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 overflow-hidden shadow-2xs">
              {filteredTrash.map((item) => (
                <div
                  key={item.id}
                  className="p-4 hover:bg-stone-50/80 dark:hover:bg-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="text-xl shrink-0 p-1.5 bg-stone-100 dark:bg-zinc-800 rounded-lg">{item.icon || '📄'}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-stone-900 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white truncate">
                        {item.title || 'Untitled Document'}
                      </span>
                      {item.deletedAt && (
                        <div className="flex items-center gap-1.5 text-[11px] text-stone-400 dark:text-zinc-500 font-mono mt-0.5">
                          <Clock className="w-3 h-3 text-stone-400 dark:text-zinc-500" />
                          <span>Deleted {new Date(item.deletedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => onRestore(item.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 text-stone-800 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer border border-stone-200/80 dark:border-zinc-700/80 shadow-2xs"
                      title="Restore document"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-stone-600 dark:text-zinc-400" />
                      <span>Restore</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => promptPermanentDelete(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-400 dark:text-zinc-500 hover:text-rose-700 dark:hover:text-rose-400 text-xs font-medium transition-colors cursor-pointer"
                      title="Delete permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete permanently</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Styled Custom Confirmation Modal */}
      {confirmConfig && (
        <ConfirmModal
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmText={confirmConfig.confirmText}
          cancelText="Cancel"
          variant="danger"
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmConfig(null)}
        />
      )}
    </div>
  );
};
