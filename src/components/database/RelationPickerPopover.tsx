import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRelationCandidates, createRelatedItem } from '~/server/databases';
import { DatabasePopover } from './DatabasePopover';
import {
  Search,
  Check,
  Plus,
  FileText,
  Loader2,
} from 'lucide-react';

interface RelationPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  targetDatabaseId: string;
  selectedIds: string[];
  limit?: 'single' | 'multiple';
  onChange: (nextIds: string[]) => void;
  onItemCreated?: (item: { id: string; title: string; pageId?: string | null; databaseId: string }) => void;
  readOnly?: boolean;
}

export function RelationPickerPopover({
  isOpen,
  onClose,
  triggerRef,
  targetDatabaseId,
  selectedIds = [],
  limit = 'multiple',
  onChange,
  onItemCreated,
  readOnly = false,
}: RelationPickerPopoverProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setDebouncedQuery('');
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Debounce search keystrokes (200ms) to avoid request storms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch candidates pool from target database with 60s staleTime for instant reopen
  const { data: baseData, isLoading: isBaseLoading } = useQuery({
    queryKey: ['relationCandidates', targetDatabaseId],
    queryFn: async () => {
      if (!targetDatabaseId) return { database: null, items: [] };
      return await getRelationCandidates({
        data: {
          targetDatabaseId,
          limit: 100,
        },
      });
    },
    enabled: isOpen && !!targetDatabaseId,
    staleTime: 60 * 1000,
  });

  const baseItems = useMemo(() => baseData?.items || [], [baseData?.items]);
  const targetDatabase = baseData?.database;

  // Fast 0ms local client filtering for instantaneous responsiveness
  const filteredBaseItems = useMemo(() => {
    if (!searchQuery.trim()) return baseItems;
    const q = searchQuery.trim().toLowerCase();
    return baseItems.filter((i) => (i.title || 'Untitled').toLowerCase().includes(q));
  }, [baseItems, searchQuery]);

  // Deep server search if database has 100+ items and user searches
  const hasMoreThanBase = baseItems.length >= 100;
  const shouldSearchServer = Boolean(debouncedQuery && hasMoreThanBase);

  const { data: serverSearchData, isFetching: isSearchingServer } = useQuery({
    queryKey: ['relationCandidates', targetDatabaseId, debouncedQuery],
    queryFn: async () => {
      return await getRelationCandidates({
        data: {
          targetDatabaseId,
          searchQuery: debouncedQuery,
          limit: 50,
        },
      });
    },
    enabled: isOpen && shouldSearchServer,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  // Seamlessly merge server search results with locally filtered matches
  const displayItems = useMemo(() => {
    if (!searchQuery.trim()) return baseItems;
    if (!shouldSearchServer || !serverSearchData?.items) {
      return filteredBaseItems;
    }
    const seen = new Set<string>();
    const merged: typeof baseItems = [];
    for (const item of [...serverSearchData.items, ...filteredBaseItems]) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }
    return merged;
  }, [searchQuery, shouldSearchServer, serverSearchData?.items, filteredBaseItems, baseItems]);

  // Fast O(1) candidate lookup map
  const candidateLookup = useMemo(() => {
    const map = new Map<string, { id: string; title: string; pageId?: string | null; databaseId: string }>();
    for (const item of baseItems) {
      map.set(item.id, {
        id: item.id,
        title: item.title || 'Untitled',
        pageId: item.pageId,
        databaseId: item.databaseId,
      });
    }
    if (serverSearchData?.items) {
      for (const item of serverSearchData.items) {
        map.set(item.id, {
          id: item.id,
          title: item.title || 'Untitled',
          pageId: item.pageId,
          databaseId: item.databaseId,
        });
      }
    }
    return map;
  }, [baseItems, serverSearchData?.items]);

  // Mutation to create new related record
  const createItemMutation = useMutation({
    mutationFn: async ({ title, tempId }: { title: string; tempId: string }) => {
      const newItem = await createRelatedItem({
        data: {
          targetDatabaseId,
          title,
        },
      });
      return { newItem, tempId };
    },
    onSuccess: ({ newItem, tempId }) => {
      queryClient.invalidateQueries({ queryKey: ['relationCandidates', targetDatabaseId] });
      queryClient.invalidateQueries({ queryKey: ['database', targetDatabaseId] });
      if (onItemCreated) {
        onItemCreated(newItem);
      }
      // Swap tempId with the real newItem.id
      if (limit === 'single') {
        onChange([newItem.id]);
      } else {
        onChange(selectedIds.map((id) => (id === tempId ? newItem.id : id)));
      }
    },
    onError: (_err, { tempId }) => {
      // Rollback optimistic tempId from selection
      if (limit === 'single') {
        onChange([]);
      } else {
        onChange(selectedIds.filter((id) => id !== tempId));
      }
    },
  });

  const handleToggleItem = (itemId: string) => {
    if (readOnly) return;
    const isAlreadySelected = selectedIds.includes(itemId);

    if (limit === 'single') {
      if (isAlreadySelected) {
        onChange([]);
      } else {
        const itemObj = candidateLookup.get(itemId);
        if (itemObj && onItemCreated) {
          onItemCreated(itemObj);
        }
        onChange([itemId]);
        onClose();
      }
    } else {
      if (isAlreadySelected) {
        onChange(selectedIds.filter((id) => id !== itemId));
      } else {
        const itemObj = candidateLookup.get(itemId);
        if (itemObj && onItemCreated) {
          onItemCreated(itemObj);
        }
        onChange([...selectedIds, itemId]);
      }
    }
  };

  const exactMatchExists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return displayItems.some((i) => (i.title || '').trim().toLowerCase() === q);
  }, [displayItems, searchQuery]);

  const handleCreateNew = () => {
    const title = searchQuery.trim();
    if (!title || createItemMutation.isPending) return;
    const tempId = 'temp-rel-' + Date.now();
    const tempObj = {
      id: tempId,
      title,
      databaseId: targetDatabaseId,
      pageId: null,
    };
    if (onItemCreated) {
      onItemCreated(tempObj);
    }
    if (limit === 'single') {
      onChange([tempId]);
      onClose();
    } else {
      onChange([...selectedIds, tempId]);
    }
    setSearchQuery('');
    createItemMutation.mutate({ title, tempId });
  };

  return (
    <DatabasePopover
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      width={280}
    >
      <div className="p-2 space-y-2 font-sans text-left select-none">
        {/* Search Header */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder={`Search ${targetDatabase?.title || 'records'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (displayItems.length > 0 && searchQuery.trim()) {
                  handleToggleItem(displayItems[0].id);
                } else if (!exactMatchExists && searchQuery.trim()) {
                  handleCreateNew();
                }
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }
            }}
            className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border bg-stone-50 dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#1f4d3d]"
          />
          {isSearchingServer && (
            <Loader2 className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-stone-400 dark:text-zinc-500 pointer-events-none" />
          )}
        </div>

        {/* Selected Summary & Clear Option */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between px-1 text-[11px] text-stone-500 dark:text-zinc-400 border-b border-stone-100 dark:border-zinc-800/80 pb-1">
            <span>{selectedIds.length} linked</span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 font-medium hover:underline cursor-pointer"
              >
                Unlink all
              </button>
            )}
          </div>
        )}

        {/* Candidate List */}
        <div className="max-h-56 overflow-y-auto space-y-0.5 no-scrollbar">
          {isBaseLoading ? (
            <div className="py-6 flex flex-col items-center justify-center gap-1 text-xs text-stone-400">
              <Loader2 className="w-4 h-4 animate-spin text-[#1f4d3d] dark:text-emerald-400" />
              <span>Loading records...</span>
            </div>
          ) : displayItems.length === 0 && !searchQuery.trim() ? (
            <div className="py-6 text-center text-xs text-stone-400 italic">
              No records in this database yet
            </div>
          ) : displayItems.length === 0 && searchQuery.trim() ? (
            <div className="py-6 text-center text-xs text-stone-400 italic">
              No records matching "{searchQuery.trim()}"
            </div>
          ) : (
            displayItems.map((item) => {
              const isChecked = selectedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleToggleItem(item.id)}
                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    isChecked
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#1f4d3d] dark:text-emerald-300 font-medium'
                      : 'hover:bg-stone-100 dark:hover:bg-zinc-800/70 text-stone-800 dark:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 mr-2">
                    <FileText className="w-3.5 h-3.5 shrink-0 opacity-60 text-stone-500" />
                    <span className="truncate">
                      {item.title || 'Untitled'}
                    </span>
                  </div>
                  {isChecked && (
                    <div className="w-3.5 h-3.5 rounded-full bg-[#1f4d3d] dark:bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Create new item button if searching and not matching */}
        {searchQuery.trim() && !exactMatchExists && !readOnly && (
          <div className="pt-2 border-t border-stone-200/80 dark:border-zinc-800/80">
            <button
              type="button"
              onClick={handleCreateNew}
              disabled={createItemMutation.isPending}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1f4d3d] text-white rounded-lg hover:bg-[#183e31] active:scale-[0.96] transition-transform cursor-pointer shadow-xs"
            >
              {createItemMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span className="truncate">
                Create "{searchQuery.trim()}" in {targetDatabase?.title || 'database'}
              </span>
            </button>
          </div>
        )}
      </div>
    </DatabasePopover>
  );
}
