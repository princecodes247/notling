import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient, useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import type { DatabaseItem, DatabaseProperty, Page, DatabaseView, DatabaseForm } from '~/db/schema';
import type { FullDatabase } from '~/server/databases.db';
import { DatabaseTableView } from './DatabaseTableView';
import { DatabaseBoardView } from './DatabaseBoardView';
import { DatabaseGalleryView } from './DatabaseGalleryView';
import { DatabaseListView } from './DatabaseListView';
import { DatabaseChartView } from './DatabaseChartView';
import { DatabaseFormView } from './DatabaseFormView';
import { DatabaseRowDrawer } from './DatabaseRowDrawer';
import { NewViewPopover, VIEW_LAYOUT_OPTIONS } from './NewViewPopover';
import { ViewConfigDrawer } from './ViewConfigDrawer';
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
  createDatabaseView,
  updateDatabaseView,
  deleteDatabaseView,
  updateFormSettings,
} from '~/server/databases';
import { getPage, updatePageVisibility } from '~/server/pages';
import { useUIStore } from '~/store/uiStore';
import { updateClientPageMeta } from '~/lib/pageMetaSync';
import { EditorHeader } from '../EditorHeader';
import { ShareModal } from '../ShareModal';
import { ExportModal } from '../ExportModal';
import { DatabaseImportModal } from './DatabaseImportModal';
import {
  Plus,
  SlidersHorizontal,
  MoreHorizontal,
  Trash2,
  Copy,
  Edit2,
  Table,
} from 'lucide-react';
import { cn } from '#/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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

  // View state
  const views = useMemo<DatabaseView[]>(() => {
    if (dbData.views && dbData.views.length > 0) {
      return dbData.views;
    }
    return [
      {
        id: 'default-table-view',
        databaseId: dbData.database.id,
        name: 'Table',
        type: 'table',
        config: {},
        order: 0,
        createdAt: new Date(),
      },
    ];
  }, [dbData.views, dbData.database.id]);

  const [activeViewId, setActiveViewId] = useState<string>(views[0]?.id || 'default-table-view');
  const [isNewViewPopoverOpen, setIsNewViewPopoverOpen] = useState(false);
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState(false);
  const [renamingViewId, setRenamingViewId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState('');
  const [activeTabMenuId, setActiveTabMenuId] = useState<string | null>(null);
  const [tabMenuTriggerEl, setTabMenuTriggerEl] = useState<HTMLElement | null>(null);
  const newViewTriggerRef = useRef<HTMLButtonElement>(null);

  // Sync active view if activeViewId is not in views
  const activeView = useMemo(() => {
    return views.find((v) => v.id === activeViewId) || views[0];
  }, [views, activeViewId]);

  useEffect(() => {
    if (views.length > 0 && !views.some((v) => v.id === activeViewId)) {
      setActiveViewId(views[0].id);
    }
  }, [views, activeViewId]);

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

  // View CRUD Handlers
  const handleCreateView = async (type: string, defaultName: string) => {
    if (readOnly) return;
    const tempViewId = crypto.randomUUID();
    const existingNames = new Set(views.map((v) => (v.name || '').trim().toLowerCase()));
    let finalName = defaultName;
    let idx = 2;
    while (existingNames.has(finalName.toLowerCase())) {
      finalName = `${defaultName} ${idx++}`;
    }

    const optimisticView: DatabaseView = {
      id: tempViewId,
      databaseId: dbData.database.id,
      name: finalName,
      type,
      config: {},
      order: views.length,
      createdAt: new Date(),
    };

    updateLocalAndCache((prev) => ({
      ...prev,
      views: [...(prev.views || []), optimisticView],
    }));
    setActiveViewId(tempViewId);

    try {
      const res = await createDatabaseView({
        data: {
          databaseId: dbData.database.id,
          name: finalName,
          type,
          config: {},
        },
      });

      if (res?.id) {
        updateLocalAndCache((prev) => ({
          ...prev,
          views: (prev.views || []).map((v) => (v.id === tempViewId ? { ...v, id: res.id } : v)),
        }));
        setActiveViewId(res.id);
      }
    } catch (err) {
      console.error('Failed to create view on server:', err);
    }
  };

  const handleUpdateView = async (viewId: string, updates: Partial<DatabaseView>) => {
    if (readOnly) return;
    updateLocalAndCache((prev) => ({
      ...prev,
      views: (prev.views || []).map((v) => (v.id === viewId ? { ...v, ...updates } : v)),
    }));

    try {
      await updateDatabaseView({
        data: {
          viewId,
          updates: {
            name: updates.name,
            type: updates.type,
            config: updates.config,
            order: updates.order,
          },
        },
      });
    } catch (err) {
      console.error('Failed to update view:', err);
    }
  };

  const handleDeleteView = async (viewId: string) => {
    if (readOnly || views.length <= 1) return;
    const remainingViews = views.filter((v) => v.id !== viewId);
    updateLocalAndCache((prev) => ({
      ...prev,
      views: (prev.views || []).filter((v) => v.id !== viewId),
    }));

    if (activeViewId === viewId) {
      setActiveViewId(remainingViews[0]?.id || 'default-table-view');
    }

    try {
      await deleteDatabaseView({ data: viewId });
    } catch (err) {
      console.error('Failed to delete view:', err);
    }
  };

  const handleDuplicateView = (view: DatabaseView) => {
    handleCreateView(view.type, `${view.name} Copy`);
  };

  // Form Handlers
  const activeForm = useMemo<DatabaseForm | undefined>(() => {
    if (!dbData.forms || dbData.forms.length === 0) return undefined;
    return dbData.forms.find((f) => f.viewId === activeView.id) || dbData.forms[0];
  }, [dbData.forms, activeView.id]);

  const handleUpdateFormSettings = async (formId: string, updates: any) => {
    if (readOnly) return;
    updateLocalAndCache((prev) => ({
      ...prev,
      forms: (prev.forms || []).map((f) =>
        f.id === formId
          ? {
              ...f,
              ...updates,
              settings: {
                ...(f.settings || {}),
                ...(updates.settings || {}),
              },
            }
          : f
      ),
    }));

    try {
      await updateFormSettings({
        data: {
          formId,
          updates,
        },
      });
    } catch (err) {
      console.error('Failed to update form settings:', err);
    }
  };

  const handleSubmitTestForm = async (properties: Record<string, any>, title?: string) => {
    const titleProp = dbData.properties.find((p) => p.type === 'title');
    await handleAddItem({
      ...(titleProp && title ? { [titleProp.id]: title } : {}),
      ...properties,
    });
  };

  // Get Layout Icon for a view tab
  const getViewIcon = (type: string) => {
    const opt = VIEW_LAYOUT_OPTIONS.find((o) => o.type === type);
    return opt ? opt.icon : Table;
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full font-sans text-stone-900 dark:text-zinc-100 bg-white dark:bg-[#18181b] overflow-hidden relative">
      {!hideHeader && (
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

      {/* Main Database Title Header inside Canvas */}
      <div className={cn(
        "px-4 sm:px-8 pt-5 pb-2 shrink-0 select-none",
        hideHeader ? "max-w-7xl mx-auto w-full pt-8" : ""
      )}>
        <div className="flex items-center gap-3 group">
          <div className="text-3xl sm:text-4xl shrink-0 select-none cursor-default">
            {dbData.database.icon || '📊'}
          </div>
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
              className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight bg-transparent hover:bg-stone-100/60 dark:hover:bg-zinc-800/40 focus:bg-stone-100/80 dark:focus:bg-zinc-800/60 focus:outline-none px-2 py-0.5 rounded-lg w-full transition-colors placeholder:text-stone-300 dark:placeholder:text-zinc-600"
              placeholder="Untitled Database"
            />
          ) : (
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight px-2 py-0.5">
              {dbTitle || 'Untitled Database'}
            </h1>
          )}
        </div>
      </div>

      {/* View Switcher Tabs Bar */}
      <div className={cn(
        "flex items-center justify-between border-b border-stone-200/80 dark:border-zinc-800/80 px-4 sm:px-8 bg-transparent select-none",
        hideHeader ? "max-w-7xl mx-auto" : ""
      )}>
        {/* Left: Views Tab List */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 min-w-0">
          {views.map((view) => {
            const Icon = getViewIcon(view.type);
            const isActive = activeView.id === view.id;
            const isRenaming = renamingViewId === view.id;

            return (
              <div key={view.id} className="relative flex items-center shrink-0 group">
                {isRenaming && !readOnly ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800 shadow-2xs border border-[#1f4d3d] dark:border-emerald-500">
                    <Icon className="w-3.5 h-3.5 text-[#1f4d3d] dark:text-emerald-400" />
                    <input
                      type="text"
                      value={renamingName}
                      onChange={(e) => setRenamingName(e.target.value)}
                      onBlur={() => {
                        if (renamingName.trim()) {
                          handleUpdateView(view.id, { name: renamingName.trim() });
                        }
                        setRenamingViewId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (renamingName.trim()) {
                            handleUpdateView(view.id, { name: renamingName.trim() });
                          }
                          setRenamingViewId(null);
                        } else if (e.key === 'Escape') {
                          setRenamingViewId(null);
                        }
                      }}
                      autoFocus
                      className="text-xs font-semibold bg-transparent text-stone-900 dark:text-zinc-100 focus:outline-none w-24"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveViewId(view.id)}
                    onDoubleClick={() => {
                      if (!readOnly) {
                        setRenamingViewId(view.id);
                        setRenamingName(view.name);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer",
                      isActive
                        ? "bg-white dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 shadow-2xs border border-stone-200/80 dark:border-zinc-700 font-semibold"
                        : "text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200 hover:bg-stone-100/70 dark:hover:bg-zinc-800/50"
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5", isActive ? "text-[#1f4d3d] dark:text-emerald-400" : "text-stone-400 dark:text-zinc-500")} />
                    <span className="truncate max-w-[140px]">{view.name}</span>

                    {/* Three-dots menu trigger on tab */}
                    {!readOnly && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeTabMenuId === view.id) {
                            setActiveTabMenuId(null);
                            setTabMenuTriggerEl(null);
                          } else {
                            setActiveTabMenuId(view.id);
                            setTabMenuTriggerEl(e.currentTarget);
                          }
                        }}
                        className={cn(
                          "p-0.5 rounded hover:bg-stone-200/70 dark:hover:bg-zinc-700 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 transition-opacity",
                          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                )}

                {/* Tab Context Menu Dropdown */}
                {activeTabMenuId === view.id && (
                  <TabContextMenu
                    triggerEl={tabMenuTriggerEl}
                    viewsCount={views.length}
                    onClose={() => {
                      setActiveTabMenuId(null);
                      setTabMenuTriggerEl(null);
                    }}
                    onRename={() => {
                      setActiveTabMenuId(null);
                      setTabMenuTriggerEl(null);
                      setRenamingViewId(view.id);
                      setRenamingName(view.name);
                    }}
                    onDuplicate={() => {
                      setActiveTabMenuId(null);
                      setTabMenuTriggerEl(null);
                      handleDuplicateView(view);
                    }}
                    onOptions={() => {
                      setActiveTabMenuId(null);
                      setTabMenuTriggerEl(null);
                      setActiveViewId(view.id);
                      setIsConfigDrawerOpen(true);
                    }}
                    onDelete={() => {
                      setActiveTabMenuId(null);
                      setTabMenuTriggerEl(null);
                      handleDeleteView(view.id);
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* Add View '+' Trigger Button */}
          {!readOnly && (
            <div className="relative shrink-0">
              <button
                ref={newViewTriggerRef}
                type="button"
                onClick={() => setIsNewViewPopoverOpen(!isNewViewPopoverOpen)}
                className="p-1 hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 rounded-md transition-colors cursor-pointer"
                title="Add View"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              <AnimatePresence>
                {isNewViewPopoverOpen && (
                  <NewViewPopover
                    isOpen={isNewViewPopoverOpen}
                    onClose={() => setIsNewViewPopoverOpen(false)}
                    onSelectLayout={handleCreateView}
                    triggerRef={newViewTriggerRef}
                  />
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right: View Options Trigger */}
        <div className="flex items-center gap-2 py-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsConfigDrawerOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Configure View Options"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Options</span>
          </button>
        </div>
      </div>

      {/* Dynamic View Content Based on activeView.type */}
      <div
        className={cn(
          "flex-1 min-h-0 w-full",
          activeView.type === 'table' || activeView.type === 'board'
            ? "overflow-hidden flex flex-col"
            : "overflow-y-auto",
          hideHeader
            ? cn("max-w-7xl mx-auto px-4 sm:px-8 pt-4", activeView.type === 'table' || activeView.type === 'board' ? "pb-4" : "pb-20")
            : cn("px-4 sm:px-8 pt-2", activeView.type === 'table' || activeView.type === 'board' ? "pb-2" : "pb-20")
        )}
      >
        {activeView.type === 'board' ? (
          <DatabaseBoardView
            properties={dbData.properties}
            items={allItems}
            groupByPropertyId={activeView.config?.groupByPropertyId}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onAddItem={handleAddItem}
            onOpenRowDrawer={(item) => setSelectedDrawerItem(item)}
            readOnly={readOnly}
          />
        ) : activeView.type === 'gallery' ? (
          <DatabaseGalleryView
            properties={dbData.properties}
            items={allItems}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onAddItem={handleAddItem}
            onOpenRowDrawer={(item) => setSelectedDrawerItem(item)}
            readOnly={readOnly}
          />
        ) : activeView.type === 'list' ? (
          <DatabaseListView
            properties={dbData.properties}
            items={allItems}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onAddItem={handleAddItem}
            onOpenRowDrawer={(item) => setSelectedDrawerItem(item)}
            readOnly={readOnly}
          />
        ) : activeView.type === 'chart' ? (
          <DatabaseChartView
            properties={dbData.properties}
            items={allItems}
          />
        ) : activeView.type === 'form' ? (
          <DatabaseFormView
            form={activeForm}
            databaseTitle={dbTitle}
            databaseIcon={dbData.database.icon || '📊'}
            properties={dbData.properties}
            onUpdateFormSettings={handleUpdateFormSettings}
            onSubmitTestForm={handleSubmitTestForm}
            readOnly={readOnly}
          />
        ) : (
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
        )}
      </div>

      {/* View Config Drawer Modal */}
      <AnimatePresence>
        {isConfigDrawerOpen && (
          <ViewConfigDrawer
            isOpen={isConfigDrawerOpen}
            view={activeView}
            properties={dbData.properties}
            onClose={() => setIsConfigDrawerOpen(false)}
            onUpdateView={handleUpdateView}
            onDeleteView={handleDeleteView}
            canDelete={views.length > 1}
          />
        )}
      </AnimatePresence>

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

interface TabContextMenuProps {
  triggerEl: HTMLElement | null;
  viewsCount: number;
  onClose: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onOptions: () => void;
  onDelete: () => void;
}

function TabContextMenu({
  triggerEl,
  viewsCount,
  onClose,
  onRename,
  onDuplicate,
  onOptions,
  onDelete,
}: TabContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useState({});

  const computePosition = () => {
    if (typeof window === 'undefined' || !triggerEl) return null;
    const rect = triggerEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = 180;
    const height = 150;

    let top = rect.bottom + 6;
    if (top + height > viewportHeight - 12 && rect.top - height - 6 > 12) {
      top = rect.top - height - 6;
    }

    let left = rect.left;
    if (left + width > viewportWidth - 12) {
      left = viewportWidth - width - 12;
    }
    if (left < 12) left = 12;

    return { top: Math.max(12, top), left: Math.max(12, left) };
  };

  useLayoutEffect(() => {
    forceUpdate({});
  }, []);

  useEffect(() => {
    const handleScrollOrResize = () => forceUpdate({});
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target) && (!triggerEl || !triggerEl.contains(target))) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleOutsideClick, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [onClose, triggerEl]);

  if (typeof document === 'undefined' || !triggerEl) return null;
  const pos = computePosition();
  if (!pos) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="tab-context-menu"
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          top: `${pos.top}px`,
          left: `${pos.left}px`,
          zIndex: 99999,
        }}
        className="w-40 p-1 rounded-lg bg-white dark:bg-[#18181b] border border-stone-200/80 dark:border-zinc-800 shadow-xl text-xs space-y-0.5 select-none"
      >
        <button
          type="button"
          onClick={onRename}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
        >
          <Edit2 className="w-3.5 h-3.5 text-stone-400" />
          <span>Rename</span>
        </button>

        <button
          type="button"
          onClick={onDuplicate}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5 text-stone-400" />
          <span>Duplicate view</span>
        </button>

        <button
          type="button"
          onClick={onOptions}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-stone-400" />
          <span>View options</span>
        </button>

        {viewsCount > 1 && (
          <>
            <div className="my-1 border-t border-stone-100 dark:border-zinc-800" />
            <button
              type="button"
              onClick={onDelete}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left transition-colors cursor-pointer font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete view</span>
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}



