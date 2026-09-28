import React, { useState, useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Delete02Icon,
  Search01Icon,
  Sorting01Icon,
  GridIcon,
  Menu01Icon,
  File01Icon,
  Clock01Icon,
  HistoryIcon,
} from '@hugeicons/core-free-icons';
import { motion } from 'motion/react';
import { ConfirmModal } from '~/components/ConfirmModal';

export interface TrashedPageItem {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alpha'>('newest');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    onConfirm: () => void;
  } | null>(null);

  const filteredSortedTrash = useMemo(() => {
    let items = [...trashPages];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((item) => (item.title || 'Untitled Document').toLowerCase().includes(q));
    }

    if (sortBy === 'newest') {
      items.sort((a, b) => new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime());
    } else if (sortBy === 'oldest') {
      items.sort((a, b) => new Date(a.deletedAt || 0).getTime() - new Date(b.deletedAt || 0).getTime());
    } else if (sortBy === 'alpha') {
      items.sort((a, b) => (a.title || 'Untitled').localeCompare(b.title || 'Untitled'));
    }

    return items;
  }, [trashPages, searchQuery, sortBy]);

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
    <div className="flex-1 pt-12 w-full h-full bg-white dark:bg-[#18181b] text-stone-900 dark:text-zinc-100 overflow-y-auto select-none p-4 sm:p-10 pb-6 sm:pb-10 font-sans flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-100 dark:border-zinc-800/80">
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
              Documents in trash can be restored anytime or deleted permanently.
            </p>
          </div>

          {/* Top Actions */}
          {trashPages.length > 0 && (
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onRestoreAll}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-stone-200/90 dark:border-zinc-700/80 hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-800 dark:text-zinc-200 text-xs font-medium transition-colors cursor-pointer shadow-2xs active-press"
              >
                <HugeiconsIcon icon={HistoryIcon} size={14} className="text-stone-500 dark:text-zinc-400" />
                <span>Restore All</span>
              </button>
              <button
                type="button"
                onClick={promptEmptyTrash}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-medium transition-colors shadow-2xs cursor-pointer active-press"
              >
                <HugeiconsIcon icon={Delete02Icon} size={14} className="text-rose-600 dark:text-rose-400" />
                <span>Empty Trash</span>
              </button>
            </div>
          )}
        </div>

        {/* Search & Filter Controls */}
        {trashPages.length > 0 && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <HugeiconsIcon
                icon={Search01Icon}
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Filter trashed documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-neutral-200/90 dark:border-zinc-800 bg-neutral-50/70 dark:bg-zinc-900/60 text-neutral-900 dark:text-zinc-100 placeholder-stone-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#1f4d3d] focus:bg-white dark:focus:bg-zinc-900 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-stone-400 hover:text-stone-700 dark:hover:text-zinc-300 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Sort & View Mode Controls */}
            <div className="flex items-center gap-2">
              {/* Sort Selector */}
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-neutral-600 dark:text-zinc-300">
                <HugeiconsIcon icon={Sorting01Icon} size={14} className="text-neutral-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent border-none focus:outline-none cursor-pointer text-xs"
                >
                  <option value="newest">Newest deleted</option>
                  <option value="oldest">Oldest deleted</option>
                  <option value="alpha">Alphabetical</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center p-1 rounded-xl bg-neutral-100/80 dark:bg-zinc-800/60 border border-neutral-200/60 dark:border-zinc-700/50">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg cursor-pointer transition-colors ${viewMode === 'grid'
                    ? 'bg-white dark:bg-zinc-900 text-neutral-900 dark:text-white shadow-2xs'
                    : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-zinc-300'
                    }`}
                  title="Grid View"
                >
                  <HugeiconsIcon icon={GridIcon} size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg cursor-pointer transition-colors ${viewMode === 'list'
                    ? 'bg-white dark:bg-zinc-900 text-neutral-900 dark:text-white shadow-2xs'
                    : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-zinc-300'
                    }`}
                  title="List View"
                >
                  <HugeiconsIcon icon={Menu01Icon} size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Counter Summary */}
        {trashPages.length > 0 && (
          <div className="text-xs text-neutral-400 dark:text-zinc-500 font-medium">
            Showing {filteredSortedTrash.length} of {trashPages.length} items
          </div>
        )}

        {/* Content Section */}
        {trashPages.length === 0 ? (
          /* Empty Trash State (HIG Deference) */
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-4 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-500 dark:text-zinc-400 flex items-center justify-center mb-4 shadow-2xs">
              <HugeiconsIcon icon={Delete02Icon} size={24} />
            </div>
            <h3 className="text-base font-semibold text-stone-950 dark:text-white tracking-tight">
              Trash is empty
            </h3>
            <p className="text-xs text-stone-500 dark:text-zinc-400 max-w-sm mt-1 leading-relaxed">
              Pages and documents you delete in your workspace will appear here.
            </p>
          </div>
        ) : filteredSortedTrash.length === 0 ? (
          /* No search results */
          <div className="py-20 border border-dashed border-neutral-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center p-8 gap-3 bg-neutral-50/40 dark:bg-zinc-900/40">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-500 dark:text-zinc-400 flex items-center justify-center shadow-2xs">
              <HugeiconsIcon icon={Search01Icon} size={22} />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <h3 className="text-base font-semibold text-neutral-950 dark:text-white tracking-tight">
                No matching documents
              </h3>
              <p className="text-xs text-neutral-500 dark:text-zinc-400 leading-relaxed">
                No trashed documents match "{searchQuery}".
              </p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View Layout */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredSortedTrash.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="group rounded-lg border border-stone-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#1f1f23] hover:border-stone-300 dark:hover:border-zinc-700 p-4 flex flex-col justify-between gap-4 transition-all hover:shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-lg bg-stone-50 dark:bg-zinc-800/80 border border-stone-200/80 dark:border-zinc-700/80 flex items-center justify-center text-lg shrink-0">
                    {item.icon ? (
                      item.icon
                    ) : (
                      <HugeiconsIcon icon={File01Icon} size={16} className="text-stone-400 dark:text-zinc-500" />
                    )}
                  </div>

                  <span className="px-1.5 py-0.2 rounded-md text-[9px] font-mono uppercase bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40">
                    Trashed
                  </span>
                </div>

                <div className="space-y-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-zinc-100 truncate">
                    {item.title || 'Untitled Document'}
                  </h3>
                  {item.deletedAt && (
                    <p className="text-[11px] text-stone-400 dark:text-zinc-500 flex items-center gap-1">
                      <HugeiconsIcon icon={Clock01Icon} size={12} className="text-stone-400 dark:text-zinc-500 shrink-0" />
                      <span>Deleted {new Date(item.deletedAt).toLocaleDateString()}</span>
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-stone-400 dark:text-zinc-500">
                  <button
                    type="button"
                    onClick={() => onRestore(item.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 text-stone-800 dark:text-zinc-200 text-xs font-medium transition-colors cursor-pointer border border-stone-200/80 dark:border-zinc-700/80"
                    title="Restore document"
                  >
                    <HugeiconsIcon icon={HistoryIcon} size={12} />
                    <span>Restore</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => promptPermanentDelete(item)}
                    className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete permanently"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* List View Layout */
          <div className="divide-y divide-stone-100 dark:divide-zinc-800/80 overflow-hidden shadow-2xs">
            {filteredSortedTrash.map((item) => (
              <div
                key={item.id}
                className="p-3 px-4 flex items-center justify-between hover:bg-stone-50/80 dark:hover:bg-zinc-800/50 group transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex items-center justify-center text-base shrink-0">
                    {item.icon ? (
                      item.icon
                    ) : (
                      <HugeiconsIcon icon={File01Icon} size={16} className="text-stone-400 dark:text-zinc-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold text-stone-900 dark:text-zinc-100 truncate">
                        {item.title || 'Untitled Document'}
                      </h3>
                    </div>

                    {item.deletedAt && (
                      <span className="text-[10px] text-stone-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                        <HugeiconsIcon icon={Clock01Icon} size={11} className="text-stone-400 dark:text-zinc-500 shrink-0" />
                        <span>Deleted {new Date(item.deletedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-stone-400 shrink-0">
                  <button
                    type="button"
                    onClick={() => onRestore(item.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 text-stone-800 dark:text-zinc-200 text-xs font-medium transition-colors cursor-pointer border border-stone-200/80 dark:border-zinc-700/80 shadow-2xs"
                    title="Restore document"
                  >
                    <HugeiconsIcon icon={HistoryIcon} size={12} />
                    <span>Restore</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => promptPermanentDelete(item)}
                    className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete permanently"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
