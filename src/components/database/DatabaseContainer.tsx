import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQueryClient, useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import type { DatabaseItem, DatabaseProperty, Page } from '~/db/schema';
import type { FullDatabase } from '~/server/databases.db';
import { DatabaseTableView } from './DatabaseTableView';
import { DatabaseRowDrawer } from './DatabaseRowDrawer';
import {
  getDatabaseItems,
  createDatabaseProperty,
  updateDatabaseProperty,
  deleteDatabaseProperty,
  convertDatabasePropertyType,
  createDatabaseItem,
  updateDatabaseItem,
  deleteDatabaseItem,
  deleteDatabaseItemsBulk,
  updateDatabase,
} from '~/server/databases';
import { getPage, updatePageVisibility } from '~/server/pages';
import { useUIStore } from '~/store/uiStore';
import { updateClientPageMeta } from '~/lib/pageMetaSync';
import { EditorHeader } from '../EditorHeader';
import { ShareModal } from '../ShareModal';
import { ExportModal } from '../ExportModal';
import { DatabaseImportModal } from './DatabaseImportModal';

import { AnimatePresence } from 'motion/react';

interface DatabaseContainerProps {
  initialData: FullDatabase;
  readOnly?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  hideHeader?: boolean;
}

export function DatabaseContainer({
  initialData,
  readOnly = false,
  isPinned = false,
  onTogglePin,
  onDuplicate,
  onDelete,
  hideHeader = false,
}: DatabaseContainerProps) {
  const queryClient = useQueryClient();
  const { isShareModalOpen, setShareModalOpen, isExportModalOpen, setExportModalOpen } = useUIStore();
  const [dbData, setDbData] = useState<FullDatabase>(initialData);
  const [dbTitle, setDbTitle] = useState(initialData.database.title || 'Untitled Database');
  const savedTitleRef = useRef(initialData.database.title || 'Untitled Database');
  const isEditingTitleRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<{ propertyId: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedDrawerItem, setSelectedDrawerItem] = useState<DatabaseItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchQuery.trim();
      setDebouncedSearchQuery(trimmed.length >= 3 ? trimmed : '');
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const databaseId = initialData.database.id;
  const targetPageId = initialData.database.pageId || initialData.database.id;

  // Server-side Cursor / Infinite Scroll Query (200 rows per chunk)
  const {
    data: infiniteItemsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    refetch: refetchItems,
  } = useInfiniteQuery({
    queryKey: ['databaseItems', databaseId, debouncedSearchQuery, sortBy?.propertyId, sortBy?.direction],
    queryFn: async ({ pageParam = 0 }) => {
      return await getDatabaseItems({
        data: {
          databaseId,
          offset: pageParam,
          limit: 200,
          searchQuery: debouncedSearchQuery,
          sortBy: sortBy ? { propertyId: sortBy.propertyId, direction: sortBy.direction } : undefined,
        },
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage?.hasMore ? lastPage.nextCursor : undefined),
    initialData: !debouncedSearchQuery && !sortBy && initialData?.items
      ? {
          pages: [
            {
              items: initialData.items,
              nextCursor: (initialData.totalCount ?? initialData.items.length) > initialData.items.length ? initialData.items.length : null,
              totalCount: initialData.totalCount ?? initialData.items.length,
              hasMore: (initialData.totalCount ?? initialData.items.length) > initialData.items.length,
            },
          ],
          pageParams: [0],
        }
      : undefined,
  });

  const [lastExecutedSearchQuery, setLastExecutedSearchQuery] = useState(debouncedSearchQuery);
  useEffect(() => {
    if (!isFetching) {
      setLastExecutedSearchQuery(debouncedSearchQuery);
    }
  }, [isFetching, debouncedSearchQuery]);

  const trimmedSearch = searchQuery.trim();
  const isSearchDebouncing = trimmedSearch.length >= 3 && trimmedSearch !== debouncedSearchQuery;
  const isSearchFetching = isFetching && !isFetchingNextPage && debouncedSearchQuery !== lastExecutedSearchQuery;
  const isSearching = isSearchDebouncing || isSearchFetching;

  // Flattened items across loaded pages
  const allItems = useMemo(() => {
    if (infiniteItemsData?.pages && infiniteItemsData.pages.length > 0) {
      return infiniteItemsData.pages.flatMap((p) => p.items);
    }
    return dbData.items;
  }, [infiniteItemsData, dbData.items]);

  const totalCount = infiniteItemsData?.pages?.[0]?.totalCount ?? dbData.totalCount ?? allItems.length;

  const { data: pageData } = useQuery({
    queryKey: ['page', targetPageId],
    queryFn: async () => {
      if (!targetPageId) return null;
      return await getPage({ data: targetPageId });
    },
    enabled: !!targetPageId && isShareModalOpen,
  });

  const updateVisibilityMutation = useMutation({
    mutationFn: async (newVisibility: 'private' | 'workspace' | 'public' | 'public_edit') => {
      if (!targetPageId) return null;
      return await updatePageVisibility({ data: { pageId: targetPageId, visibility: newVisibility } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      queryClient.invalidateQueries({ queryKey: ['page', targetPageId] });
      queryClient.invalidateQueries({ queryKey: ['database', initialData.database.id] });
    },
  });

  const sharePageObject: Page = (pageData as any) || {
    id: targetPageId,
    workspaceId: initialData.database.workspaceId,
    title: dbTitle || initialData.database.title || 'Untitled Database',
    icon: dbData.database.icon || '',
    visibility: (initialData.database as any).visibility || 'workspace',
    order: 0,
    createdAt: initialData.database.createdAt,
    updatedAt: initialData.database.updatedAt,
    databaseId: initialData.database.id,
  };

  const updateLocalAndCache = (updater: (prev: FullDatabase) => FullDatabase) => {
    setDbData((prev: FullDatabase) => {
      const next = updater(prev);
      const dbId = next.database.id;
      const pageId = next.database.pageId;

      if (dbId) {
        queryClient.setQueryData(['database', dbId], next);
      }
      if (pageId && pageId !== dbId) {
        queryClient.setQueryData(['database', pageId], next);
      }
      return next;
    });
  };

  const updateInfiniteCache = (updater: (prevItems: DatabaseItem[]) => DatabaseItem[], totalDelta: number = 0) => {
    queryClient.setQueryData(['databaseItems', databaseId, debouncedSearchQuery, sortBy?.propertyId, sortBy?.direction], (old: any) => {
      if (!old?.pages) return old;
      const combined: DatabaseItem[] = old.pages.flatMap((p: any) => p.items);
      const updated = updater(combined);
      const newPages = [];
      for (let i = 0; i < updated.length; i += 200) {
        newPages.push({
          items: updated.slice(i, i + 200),
          nextCursor: old.pages[0]?.nextCursor,
          totalCount: Math.max(0, (old.pages[0]?.totalCount ?? updated.length) + totalDelta),
          hasMore: old.pages[0]?.hasMore,
        });
      }
      if (newPages.length === 0) {
        newPages.push({ items: [], nextCursor: null, totalCount: 0, hasMore: false });
      }
      return {
        ...old,
        pages: newPages,
      };
    });
  };

  React.useEffect(() => {
    setDbData(initialData);
    if (!isEditingTitleRef.current) {
      setDbTitle(initialData.database.title || 'Untitled Database');
      savedTitleRef.current = initialData.database.title || 'Untitled Database';
    }
  }, [initialData]);

  const handleSaveTitle = async () => {
    if (readOnly) return;
    isEditingTitleRef.current = false;
    const trimmed = dbTitle.trim();
    const finalTitle = trimmed || savedTitleRef.current || 'Untitled Database';

    if (finalTitle === savedTitleRef.current) {
      setDbTitle(finalTitle);
      return;
    }

    savedTitleRef.current = finalTitle;
    setDbTitle(finalTitle);

    updateLocalAndCache((prev: FullDatabase) => ({
      ...prev,
      database: {
        ...prev.database,
        title: finalTitle,
      },
    }));

    try {
      const dbId = dbData.database.id;
      const pageId = dbData.database.pageId;

      updateClientPageMeta(queryClient, { pageId: dbId, title: finalTitle, icon: dbData.database.icon });
      if (pageId) {
        updateClientPageMeta(queryClient, { pageId, title: finalTitle, icon: dbData.database.icon });
      }

      await updateDatabase({
        data: {
          databaseId: dbId,
          updates: { title: finalTitle },
        },
      });

      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      queryClient.invalidateQueries({ queryKey: ['database', dbId] });
      if (pageId) {
        queryClient.invalidateQueries({ queryKey: ['database', pageId] });
        queryClient.invalidateQueries({ queryKey: ['page', pageId] });
      }
      queryClient.invalidateQueries({ queryKey: ['databases'] });
      queryClient.invalidateQueries({ queryKey: ['databasesList'] });
    } catch (err) {
      console.error('Failed to update database title:', err);
    }
  };

  const handleRevertTitle = () => {
    isEditingTitleRef.current = false;
    setDbTitle(savedTitleRef.current);
  };

  // Handlers for Items (100% Optimistic)
  const handleAddItem = async (initialProps?: Record<string, any>) => {
    if (readOnly) return '';
    const safeProps =
      initialProps &&
        typeof initialProps === 'object' &&
        !('nativeEvent' in initialProps) &&
        !(initialProps instanceof Event)
        ? initialProps
        : {};

    const tempId = crypto.randomUUID();
    const titleProp = dbData.properties.find((p: DatabaseProperty) => p.type === 'title');
    const defaultTitle = '';
    const mergedProps = {
      ...(titleProp ? { [titleProp.id]: defaultTitle } : {}),
      ...safeProps,
    };

    const optimisticItem: DatabaseItem = {
      id: tempId,
      databaseId: dbData.database.id,
      pageId: null,
      title: defaultTitle,
      properties: mergedProps,
      content: [],
      order: allItems.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    updateLocalAndCache((prev: FullDatabase) => ({
      ...prev,
      items: [...prev.items, optimisticItem],
      totalCount: (prev.totalCount ?? prev.items.length) + 1,
    }));
    updateInfiniteCache((prev) => [...prev, optimisticItem], 1);

    try {
      const res = await createDatabaseItem({
        data: {
          id: tempId,
          databaseId: dbData.database.id,
          title: defaultTitle,
          properties: mergedProps,
        },
      });

      if (res?.pageId) {
        updateLocalAndCache((prev: FullDatabase) => ({
          ...prev,
          items: prev.items.map((item: DatabaseItem) =>
            item.id === tempId ? { ...item, pageId: res.pageId } : item
          ),
        }));
        updateInfiniteCache((prev) =>
          prev.map((item: DatabaseItem) =>
            item.id === tempId ? { ...item, pageId: res.pageId } : item
          )
        );
      }
    } catch (err) {
      console.error('Failed to save row to server:', err);
    }
    return tempId;
  };

  const handleUpdateItem = async (itemId: string, updates: { title?: string; properties?: Record<string, any> }) => {
    if (readOnly) return;
    updateLocalAndCache((prev: FullDatabase) => ({
      ...prev,
      items: prev.items.map((i: DatabaseItem) =>
        i.id === itemId
          ? {
            ...i,
            title: updates.title !== undefined ? updates.title : i.title,
            properties: updates.properties !== undefined ? updates.properties : i.properties,
          }
          : i
      ),
    }));
    updateInfiniteCache((prev) =>
      prev.map((i: DatabaseItem) =>
        i.id === itemId
          ? {
            ...i,
            title: updates.title !== undefined ? updates.title : i.title,
            properties: updates.properties !== undefined ? updates.properties : i.properties,
          }
          : i
      )
    );

    await updateDatabaseItem({
      data: {
        itemId,
        updates,
      },
    });
  };

  const handleDeleteItem = async (itemId: string) => {
    if (readOnly) return;
    updateLocalAndCache((prev: FullDatabase) => ({
      ...prev,
      items: prev.items.filter((i: DatabaseItem) => i.id !== itemId),
      totalCount: Math.max(0, (prev.totalCount ?? prev.items.length) - 1),
    }));
    updateInfiniteCache((prev) => prev.filter((i) => i.id !== itemId), -1);

    await deleteDatabaseItem({ data: itemId });
  };

  const handleDeleteItemsBulk = async (itemIds: string[]) => {
    if (readOnly) return;
    updateLocalAndCache((prev: FullDatabase) => ({
      ...prev,
      items: prev.items.filter((i: DatabaseItem) => !itemIds.includes(i.id)),
      totalCount: Math.max(0, (prev.totalCount ?? prev.items.length) - itemIds.length),
    }));
    updateInfiniteCache((prev) => prev.filter((i) => !itemIds.includes(i.id)), -itemIds.length);

    await deleteDatabaseItemsBulk({ data: itemIds });
  };

  const handleReorderItems = (fromIndex: number, toIndex: number) => {
    if (readOnly) return;
    updateLocalAndCache((prev: FullDatabase) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= prev.items.length || toIndex >= prev.items.length) return prev;
      const newItems = [...prev.items];
      const [moved] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, moved);
      return {
        ...prev,
        items: newItems,
      };
    });
    updateInfiniteCache((prev) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= prev.length || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const getUniquePropertyName = (existingProps: DatabaseProperty[], baseName: string = 'Property'): string => {
    const existingNames = new Set(existingProps.map((p) => (p.name || '').trim().toLowerCase()));
    if (!existingNames.has(baseName.toLowerCase())) {
      return baseName;
    }
    let index = 1;
    while (existingNames.has(`${baseName.toLowerCase()} ${index}`)) {
      index++;
    }
    return `${baseName} ${index}`;
  };

  // Handlers for Properties (100% Optimistic)
  const handleAddProperty = async (rawName: string, type: string) => {
    if (readOnly) return;
    const name = getUniquePropertyName(dbData.properties, rawName.trim() || 'Property');
    const tempPropId = crypto.randomUUID();
    const optimisticProp: DatabaseProperty = {
      id: tempPropId,
      databaseId: dbData.database.id,
      name,
      type: type as any,
      options: [],
      order: dbData.properties.length,
      icon: null,
    };

    updateLocalAndCache((prev: FullDatabase) => ({
      ...prev,
      properties: [...prev.properties, optimisticProp],
    }));

    try {
      await createDatabaseProperty({
        data: {
          id: tempPropId,
          databaseId: dbData.database.id,
          name,
          type,
        },
      });
    } catch (err) {
      console.error('Failed to save property to server:', err);
    }
  };

  const handleUpdateProperty = async (propertyId: string, updates: Partial<DatabaseProperty>) => {
    if (readOnly) return;
    updateLocalAndCache((prev: FullDatabase) => ({
      ...prev,
      properties: prev.properties.map((p: DatabaseProperty) => (p.id === propertyId ? { ...p, ...updates } : p)),
    }));

    await updateDatabaseProperty({
      data: {
        propertyId,
        updates,
      },
    });
  };

  const handleConvertPropertyType = async (propertyId: string, targetType: string) => {
    if (readOnly) return;
    const updatedProp = await convertDatabasePropertyType({
      data: {
        propertyId,
        targetType,
      },
    });

    updateLocalAndCache((prev: FullDatabase) => ({
      ...prev,
      properties: prev.properties.map((p: DatabaseProperty) => (p.id === propertyId ? { ...p, type: updatedProp.type } : p)),
    }));
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (readOnly) return;
    updateLocalAndCache((prev: FullDatabase) => ({
      ...prev,
      properties: prev.properties.filter((p: DatabaseProperty) => p.id !== propertyId),
    }));

    await deleteDatabaseProperty({ data: propertyId });
  };

  const handleUpdateIcon = async (newIcon: string | null) => {
    if (readOnly) return;
    const iconValue = newIcon || '';
    updateLocalAndCache((prev: FullDatabase) => ({
      ...prev,
      database: {
        ...prev.database,
        icon: iconValue,
      },
    }));

    try {
      const dbId = dbData.database.id;
      const pageId = dbData.database.pageId;

      updateClientPageMeta(queryClient, { pageId: dbId, title: dbTitle, icon: iconValue });
      if (pageId) {
        updateClientPageMeta(queryClient, { pageId, title: dbTitle, icon: iconValue });
      }

      await updateDatabase({
        data: {
          databaseId: dbId,
          updates: { icon: iconValue },
        },
      });

      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      queryClient.invalidateQueries({ queryKey: ['database', dbId] });
      if (pageId) {
        queryClient.invalidateQueries({ queryKey: ['database', pageId] });
        queryClient.invalidateQueries({ queryKey: ['page', pageId] });
      }
      queryClient.invalidateQueries({ queryKey: ['databases'] });
      queryClient.invalidateQueries({ queryKey: ['databasesList'] });
    } catch (err) {
      console.error('Failed to update database icon:', err);
    }
  };

  return (
    <div className="w-full font-sans text-stone-900 dark:text-zinc-100 min-h-screen">
      {hideHeader ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-2">
          <div className="mb-4 flex gap-2 items-center">
            <div className="text-3xl">{dbData.database.icon || '📊'}</div>
            {!readOnly ? (
              <input
                type="text"
                value={dbTitle}
                onChange={(e) => {
                  isEditingTitleRef.current = true;
                  setDbTitle(e.target.value);
                }}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  } else if (e.key === 'Escape') {
                    handleRevertTitle();
                    e.currentTarget.blur();
                  }
                }}
                className="text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-100 tracking-tight bg-transparent focus:outline-none focus:bg-stone-100/80 dark:focus:bg-zinc-800/60 px-1 py-0.5 rounded-lg w-full transition-colors"
                placeholder="Untitled Database"
              />
            ) : (
              <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                {dbTitle || 'Untitled Database'}
              </h1>
            )}
          </div>
        </div>
      ) : (
        <EditorHeader
          icon={dbData.database.icon || ''}
          title={dbTitle}
          isDatabase={true}
          isReadOnly={readOnly}
          isPinned={isPinned}
          togglePinMutation={onTogglePin ? { mutate: onTogglePin } : undefined}
          duplicateMutation={onDuplicate ? { mutate: onDuplicate, isPending: false } : undefined}
          onDelete={onDelete}
          onTitleChange={(newTitle) => {
            isEditingTitleRef.current = true;
            setDbTitle(newTitle);
          }}
          onSaveTitle={handleSaveTitle}
          onRevertTitle={handleRevertTitle}
          onIconChange={handleUpdateIcon}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isSearching={isSearching}
          properties={dbData.properties}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onAddItem={() => handleAddItem()}
          onImportData={() => setIsImportModalOpen(true)}
        />
      )}

      {/* Direct Table Content */}
      <div className={hideHeader ? "max-w-7xl mx-auto px-4 sm:px-8 pb-16" : "py-2 px-4 pt-6 sm:px-8"}>
        <DatabaseTableView
          properties={dbData.properties}
          items={allItems}
          totalCount={totalCount}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          isSearching={isSearching}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onFetchNextPage={fetchNextPage}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onDeleteItemsBulk={handleDeleteItemsBulk}
          onReorderItems={handleReorderItems}
          onAddItem={handleAddItem}
          onAddProperty={handleAddProperty}
          onDeleteProperty={handleDeleteProperty}
          onConvertPropertyType={handleConvertPropertyType}
          onUpdateProperty={handleUpdateProperty}
          onOpenRowDrawer={(item) => setSelectedDrawerItem(item)}
          onImportData={() => setIsImportModalOpen(true)}
          readOnly={readOnly}
        />
      </div>

      {/* Row Page Drawer Modal */}
      <AnimatePresence>
        {selectedDrawerItem && (
          <DatabaseRowDrawer
            key={selectedDrawerItem.id}
            item={selectedDrawerItem}
            properties={dbData.properties}
            onClose={() => setSelectedDrawerItem(null)}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            readOnly={readOnly}
          />
        )}
      </AnimatePresence>

      {/* Share Modal for Database */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setShareModalOpen(false)}
        page={sharePageObject}
        visibility={(sharePageObject as any).visibility || 'workspace'}
        onUpdateVisibility={(newVis) => updateVisibilityMutation.mutate(newVis)}
      />

      {/* Import Modal */}
      <DatabaseImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        databaseId={dbData.database.id}
        databaseTitle={dbTitle}
        existingProperties={dbData.properties}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['database', databaseId] });
          queryClient.invalidateQueries({ queryKey: ['databaseItems', databaseId] });
          refetchItems();
        }}
      />

      {/* Export Modal for Database */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setExportModalOpen(false)}
        isDatabase={true}
        databaseData={dbData}
        page={sharePageObject}
      />
    </div>
  );
}

