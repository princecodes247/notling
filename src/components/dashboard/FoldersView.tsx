import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  PlusSignIcon,
  ArrowRight01Icon,
  Search01Icon,
  GridIcon,
  Menu01Icon,
  Sorting01Icon,
  DatabaseIcon,
  File01Icon,
  TableIcon,
} from '@hugeicons/core-free-icons';
import type { PageTreeNode } from '~/server/pages';
import type { Database } from '~/db/schema';
import { useUIStore } from '~/store/uiStore';
import { motion } from 'motion/react';
import { Star, Copy, Trash2 } from 'lucide-react';

export interface FlatItem {
  id: string;
  title: string;
  icon: string | null;
  type: 'database' | 'page';
  databaseId?: string | null;
  parentId?: string | null;
  parentTitle?: string;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  childrenCount?: number;
  children?: PageTreeNode[];
}

interface FoldersViewProps {
  treeNodes: PageTreeNode[];
  databasesList?: Database[];
  onSelectPage: (id: string) => void;
  onSelectDatabase?: (databaseId: string) => void;
  onCreateDocument: (folderId?: string) => void;
  onCreateDatabase?: () => void;
  onTogglePin?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (item: { id: string; databaseId?: string | null }) => void;
}

const PAGE_SIZE = 12;

export const FoldersView: React.FC<FoldersViewProps> = ({
  treeNodes,
  databasesList = [],
  onSelectPage,
  onSelectDatabase,
  onCreateDocument,
  onCreateDatabase,
  onTogglePin,
  onDuplicate,
  onDelete,
}) => {
  const pageMeta = useUIStore((s) => s.pageMeta);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'page' | 'database'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alpha'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Infinite Scroll state
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Flatten pageTree + databases into unified items array
  const allItems = useMemo(() => {
    const result: FlatItem[] = [];
    const dbPageIds = new Set<string>();

    function traverse(nodes: PageTreeNode[], parentTitle?: string) {
      for (const node of nodes) {
        const live = pageMeta[node.id];
        const title = live?.title ?? node.title ?? 'Untitled';
        const icon = live?.icon ?? node.icon;

        let type: 'database' | 'page' = 'page';
        if (node.databaseId) {
          type = 'database';
          dbPageIds.add(node.databaseId);
        }

        result.push({
          id: node.id,
          title,
          icon,
          type,
          databaseId: node.databaseId,
          parentId: node.parentId,
          parentTitle,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
          childrenCount: node.children?.length || 0,
          children: node.children,
        });

        if (node.children && node.children.length > 0) {
          traverse(node.children, title);
        }
      }
    }

    traverse(treeNodes);

    // Merge standalone databases from databasesList if not already included
    for (const db of databasesList) {
      if (!dbPageIds.has(db.id) && !result.some((r) => r.databaseId === db.id || r.id === db.pageId)) {
        result.push({
          id: db.id,
          title: db.title || 'Untitled Database',
          icon: db.icon || '',
          type: 'database',
          databaseId: db.id,
          createdAt: db.createdAt,
          updatedAt: db.updatedAt,
        });
      }
    }

    return result;
  }, [treeNodes, databasesList, pageMeta]);

  // Filter & Sort Items
  const filteredSortedItems = useMemo(() => {
    let items = [...allItems];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((item) => item.title.toLowerCase().includes(q));
    }

    // Category filter
    if (filterType !== 'all') {
      items = items.filter((item) => item.type === filterType);
    }

    // Sort
    if (sortBy === 'newest') {
      items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (sortBy === 'oldest') {
      items.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    } else if (sortBy === 'alpha') {
      items.sort((a, b) => a.title.localeCompare(b.title));
    }

    return items;
  }, [allItems, searchQuery, filterType, sortBy]);

  // Reset pagination on filter/search change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, filterType, sortBy]);

  const displayedItems = useMemo(() => {
    return filteredSortedItems.slice(0, visibleCount);
  }, [filteredSortedItems, visibleCount]);

  const hasMore = visibleCount < filteredSortedItems.length;

  // IntersectionObserver for Infinite Scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !isLoadingMore) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setVisibleCount((prev) => prev + PAGE_SIZE);
            setIsLoadingMore(false);
          }, 300);
        }
      },
      { root: null, rootMargin: '200px', threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore]);

  const handleItemClick = (item: FlatItem) => {
    if (item.type === 'database' && item.databaseId && onSelectDatabase) {
      onSelectDatabase(item.databaseId);
    } else {
      onSelectPage(item.id);
    }
  };

  return (
    <div className="flex-1 w-full h-full bg-white dark:bg-[#18181b] text-neutral-900 dark:text-zinc-100 flex flex-col overflow-y-auto select-none font-sans p-4 sm:p-10 pb-12 pt-10">
      <div className="max-w-6xl mx-auto w-full flex flex-col gap-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200/80 dark:border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📂</span>
              <h1 className="text-2xl font-semibold text-stone-950 dark:text-white tracking-tight">
                All Pages & Databases
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-zinc-400 mt-1">
              Browse, filter, and manage all documents, databases, and collections in your workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onCreateDocument()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-zinc-700/80 hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-800 dark:text-zinc-200 text-xs font-medium transition-all active:scale-[0.98] cursor-pointer"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={14} />
              <span>New Document</span>
            </button>

            {onCreateDatabase && (
              <button
                type="button"
                onClick={onCreateDatabase}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1f4d3d] hover:bg-[#183e31] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-medium transition-all active:scale-[0.98] shadow-2xs cursor-pointer"
              >
                <HugeiconsIcon icon={DatabaseIcon} size={14} />
                <span>New Database</span>
              </button>
            )}
          </div>
        </div>

        {/* Toolbar: Search, Filters, Sort & View Mode */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <HugeiconsIcon
              icon={Search01Icon}
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-zinc-500 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search pages and databases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-neutral-200/90 dark:border-zinc-800 bg-neutral-50/70 dark:bg-zinc-900/60 text-neutral-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#1f4d3d] focus:bg-white dark:focus:bg-zinc-900 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between md:justify-end gap-3">
            {/* Category Filter Pills */}
            <div className="flex items-center p-1 rounded-xl bg-neutral-100/80 dark:bg-zinc-800/60 text-xs font-medium border border-neutral-200/60 dark:border-zinc-700/50">
              {[
                { key: 'all', label: `All (${allItems.length})` },
                { key: 'page', label: 'Pages' },
                { key: 'database', label: 'Databases' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterType(tab.key as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${filterType === tab.key
                    ? 'bg-white dark:bg-zinc-900 text-neutral-950 dark:text-white shadow-2xs'
                    : 'text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-200'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
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
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="alpha">Alphabetical</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center p-1 rounded-xl bg-neutral-100/80 dark:bg-zinc-800/60 border border-neutral-200/60 dark:border-zinc-700/50">
                <button
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
        </div>

        {/* Counter Summary */}
        <div className="text-xs text-neutral-400 dark:text-zinc-500 font-medium">
          Showing {displayedItems.length} of {filteredSortedItems.length} items
        </div>

        {/* Items Container */}
        {filteredSortedItems.length === 0 ? (
          <div className="py-20 border border-dashed border-neutral-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center p-8 gap-3 bg-neutral-50/40 dark:bg-zinc-900/40">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-500 dark:text-zinc-400 flex items-center justify-center shadow-2xs">
              <HugeiconsIcon icon={File01Icon} size={24} />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <h3 className="text-base font-semibold text-neutral-950 dark:text-white tracking-tight">
                No items found
              </h3>
              <p className="text-xs text-neutral-500 dark:text-zinc-400 leading-relaxed">
                {searchQuery
                  ? `No pages or databases match "${searchQuery}".`
                  : 'Start by creating your first document, database, or folder.'}
              </p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid Layout */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayedItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => handleItemClick(item)}
                className="group rounded-lg border border-stone-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#1f1f23] hover:border-stone-300 dark:hover:border-zinc-700 p-4 flex flex-col justify-between gap-4 cursor-pointer transition-all hover:shadow-xs active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-lg bg-stone-50 dark:bg-zinc-800/80 border border-stone-200/80 dark:border-zinc-700/80 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                    {item.icon ? item.icon : item.type === 'database' ? <HugeiconsIcon icon={TableIcon} size={16} className="text-stone-400 dark:text-zinc-500" /> : <HugeiconsIcon icon={File01Icon} size={16} className="text-stone-400 dark:text-zinc-500" />}
                  </div>

                  <div className="flex items-center gap-1">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium uppercase tracking-wider ${item.type === 'database'
                        ? 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 border border-stone-200 dark:border-zinc-700'
                        : 'hidden'
                        }`}
                    >
                      {item.type}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-zinc-100 truncate group-hover:text-[#1f4d3d] dark:group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </h3>

                  {item.parentTitle && (
                    <p className="text-[11px] text-stone-400 dark:text-zinc-500 truncate flex items-center gap-1">
                      <span>in</span>
                      <span className="font-medium text-stone-600 dark:text-zinc-400">{item.parentTitle}</span>
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-stone-400 dark:text-zinc-500">
                  <span>
                    {(item.childrenCount || 0) > 0
                      ? `${item.childrenCount} sub-page${item.childrenCount === 1 ? '' : 's'}`
                      : item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString()
                        : 'Document'}
                  </span>

                  <div className="flex items-center gap-1">
                    {onTogglePin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(item.id);
                        }}
                        className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-400 hover:text-amber-500 transition-colors cursor-pointer"
                        title="Favorite Item"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDuplicate && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicate(item.id);
                        }}
                        className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        title="Duplicate Item"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete({ id: item.id, databaseId: item.databaseId });
                        }}
                        className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={14}
                      className="group-hover:translate-x-0.5 text-stone-300 dark:text-zinc-600 group-hover:text-stone-700 dark:group-hover:text-zinc-200 transition-all ml-0.5"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* List Layout */
          <div className="divide-y divide-stone-100 dark:divide-zinc-800/80 overflow-hidden shadow-2xs">
            {displayedItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="p-3 px-4 flex items-center justify-between hover:bg-stone-50/80 dark:hover:bg-zinc-800/50 cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex items-center justify-center text-base shrink-0">
                    {item.icon ? item.icon : item.type === 'database' ? <HugeiconsIcon icon={TableIcon} size={16} className="text-stone-400 dark:text-zinc-500" /> : <HugeiconsIcon icon={File01Icon} size={16} className="text-stone-400 dark:text-zinc-500" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold text-stone-900 dark:text-zinc-100 truncate group-hover:text-[#1f4d3d] dark:group-hover:text-emerald-400 transition-colors">
                        {item.title}
                      </h3>
                      <span
                        className={`px-1.5 py-0.2 rounded-md text-[9px] font-mono uppercase ${item.type === 'database'
                          ? 'bg-stone-100 dark:bg-zinc-800 text-stone-500'
                          : 'hidden'
                          }`}
                      >
                        {item.type}
                      </span>
                    </div>

                    {item.parentTitle && (
                      <span className="text-[10px] text-stone-400 dark:text-zinc-500">
                        In {item.parentTitle}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-stone-400 shrink-0">
                  <span className="hidden sm:inline text-[11px]">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                  </span>
                  {onTogglePin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(item.id);
                      }}
                      className="p-1 rounded-md hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-400 hover:text-amber-500 cursor-pointer"
                      title="Favorite Item"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onDuplicate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate(item.id);
                      }}
                      className="p-1 rounded-md hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 cursor-pointer"
                      title="Duplicate Item"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete({ id: item.id, databaseId: item.databaseId });
                      }}
                      className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-500 cursor-pointer"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={14}
                    className="group-hover:translate-x-0.5 text-stone-300 dark:text-zinc-600 group-hover:text-stone-700 dark:group-hover:text-zinc-200 transition-all"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Infinite Scroll Sentinel & Loader */}
        <div ref={sentinelRef} className="py-6 flex flex-col items-center justify-center min-h-[60px]">
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-zinc-400 animate-pulse">
              <div className="w-4 h-4 rounded-full border-2 border-[#1f4d3d] border-t-transparent animate-spin" />
              <span>Loading more items...</span>
            </div>
          )}

          {!hasMore && filteredSortedItems.length > 0 && (
            <span className="text-[11px] font-medium text-neutral-400 dark:text-zinc-500 border-t border-neutral-100 dark:border-zinc-800/80 pt-4 w-full text-center">
              You've reached the end of the list ({filteredSortedItems.length} items)
            </span>
          )}
        </div>

      </div>
    </div>
  );
};
