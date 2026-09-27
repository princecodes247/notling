import React, { useState, useMemo, useRef } from 'react';
import type { DatabaseItem, DatabaseProperty, DatabaseView, DatabaseForm } from '~/db/schema';
import type { FullDatabase } from '~/server/databases.db';
import { DatabaseTableView } from './DatabaseTableView';
import { DatabaseBoardView } from './DatabaseBoardView';
import { DatabaseFormView } from './DatabaseFormView';
import { DatabaseGalleryView } from './DatabaseGalleryView';
import { DatabaseListView } from './DatabaseListView';
import { DatabaseChartView } from './DatabaseChartView';
import { DatabaseRowDrawer } from './DatabaseRowDrawer';
import { NewViewPopover, VIEW_LAYOUT_OPTIONS } from './NewViewPopover';
import { ViewConfigDrawer } from './ViewConfigDrawer';
import {
  Table,
  Plus,
  Search,
  X,
  Settings2,
} from 'lucide-react';
import clsx from 'clsx';
import {
  createDatabaseProperty,
  updateDatabaseProperty,
  deleteDatabaseProperty,
  convertDatabasePropertyType,
  createDatabaseItem,
  updateDatabaseItem,
  deleteDatabaseItem,
  deleteDatabaseItemsBulk,
  createDatabaseView,
  updateDatabaseView,
  deleteDatabaseView,
  updateFormSettings,
  submitPublicForm,
} from '~/server/databases';
import { EditorHeader } from '../EditorHeader';

import { AnimatePresence } from 'motion/react';

interface DatabaseContainerProps {
  initialData: FullDatabase;
  readOnly?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

export function DatabaseContainer({
  initialData,
  readOnly = false,
  isPinned = false,
  onTogglePin,
  onDuplicate,
  onDelete,
}: DatabaseContainerProps) {
  const [dbData, setDbData] = useState<FullDatabase>(initialData);
  const [activeViewId, setActiveViewId] = useState<string>(
    initialData.views[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isViewPopoverOpen, setIsViewPopoverOpen] = useState(false);
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState(false);
  const [selectedDrawerItem, setSelectedDrawerItem] = useState<DatabaseItem | null>(null);

  const addViewBtnRef = useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    setDbData(initialData);
    setActiveViewId(initialData.views[0]?.id || '');
    setSearchQuery('');
    setSelectedDrawerItem(null);
  }, [initialData]);

  const activeView = useMemo(
    () => dbData.views.find((v: DatabaseView) => v.id === activeViewId) || dbData.views[0],
    [dbData.views, activeViewId]
  );

  const activeForm = useMemo(() => dbData.forms[0], [dbData.forms]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return dbData.items;
    const q = searchQuery.toLowerCase();
    return dbData.items.filter((item: DatabaseItem) => {
      if (item.title.toLowerCase().includes(q)) return true;
      return Object.values(item.properties || {}).some(
        (val) => typeof val === 'string' && val.toLowerCase().includes(q)
      );
    });
  }, [dbData.items, searchQuery]);

  // Handlers for Items (100% Optimistic)
  const handleAddItem = async (initialProps?: Record<string, any>) => {
    const safeProps =
      initialProps &&
      typeof initialProps === 'object' &&
      !('nativeEvent' in initialProps) &&
      !(initialProps instanceof Event)
        ? initialProps
        : {};

    const tempId = crypto.randomUUID();
    const titleProp = dbData.properties.find((p: DatabaseProperty) => p.type === 'title');
    const defaultTitle = 'Untitled';
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
      order: dbData.items.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setDbData((prev: FullDatabase) => ({
      ...prev,
      items: [...prev.items, optimisticItem],
    }));

    try {
      await createDatabaseItem({
        data: {
          id: tempId,
          databaseId: dbData.database.id,
          title: defaultTitle,
          properties: mergedProps,
        },
      });
    } catch (err) {
      console.error('Failed to save row to server:', err);
    }
    return tempId;
  };

  const handleUpdateItem = async (itemId: string, updates: { title?: string; properties?: Record<string, any> }) => {
    setDbData((prev: FullDatabase) => ({
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

    await updateDatabaseItem({
      data: {
        itemId,
        updates,
      },
    });
  };

  const handleDeleteItem = async (itemId: string) => {
    setDbData((prev: FullDatabase) => ({
      ...prev,
      items: prev.items.filter((i: DatabaseItem) => i.id !== itemId),
    }));

    await deleteDatabaseItem({ data: itemId });
  };

  const handleDeleteItemsBulk = async (itemIds: string[]) => {
    setDbData((prev: FullDatabase) => ({
      ...prev,
      items: prev.items.filter((i: DatabaseItem) => !itemIds.includes(i.id)),
    }));

    await deleteDatabaseItemsBulk({ data: itemIds });
  };

  // Handlers for Properties (100% Optimistic)
  const handleAddProperty = async (name: string, type: string) => {
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

    setDbData((prev: FullDatabase) => ({
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
    setDbData((prev: FullDatabase) => ({
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
    const updatedProp = await convertDatabasePropertyType({
      data: {
        propertyId,
        targetType,
      },
    });

    setDbData((prev: FullDatabase) => ({
      ...prev,
      properties: prev.properties.map((p: DatabaseProperty) => (p.id === propertyId ? { ...p, type: updatedProp.type } : p)),
    }));
  };

  const handleDeleteProperty = async (propertyId: string) => {
    setDbData((prev: FullDatabase) => ({
      ...prev,
      properties: prev.properties.filter((p: DatabaseProperty) => p.id !== propertyId),
    }));

    await deleteDatabaseProperty({ data: propertyId });
  };

  // Notion-Style Handlers for Views (Instant Optimistic + Auto Name)
  const handleCreateView = async (type: string, defaultName: string) => {
    const finalName = defaultName.trim() || 'View';
    const tempId = crypto.randomUUID();
    const optimisticView: DatabaseView = {
      id: tempId,
      databaseId: dbData.database.id,
      name: finalName,
      type,
      config: {},
      order: dbData.views.length,
      createdAt: new Date(),
    };

    // 0ms Latency Optimistic Update
    setDbData((prev: FullDatabase) => ({
      ...prev,
      views: [...prev.views, optimisticView],
    }));
    setActiveViewId(tempId);
    setIsConfigDrawerOpen(true);

    try {
      const createdView = await createDatabaseView({
        data: {
          databaseId: dbData.database.id,
          name: finalName,
          type,
        },
      });
      setDbData((prev: FullDatabase) => ({
        ...prev,
        views: prev.views.map((v: DatabaseView) => (v.id === tempId ? createdView : v)),
      }));
      setActiveViewId(createdView.id);
    } catch (err) {
      console.error('Failed to create view on server:', err);
    }
  };

  const handleUpdateView = async (viewId: string, updates: Partial<DatabaseView>) => {
    setDbData((prev: FullDatabase) => ({
      ...prev,
      views: prev.views.map((v: DatabaseView) => (v.id === viewId ? { ...v, ...updates } : v)),
    }));

    await updateDatabaseView({
      data: {
        viewId,
        updates,
      },
    });
  };

  const handleDeleteView = async (viewId: string) => {
    if (dbData.views.length <= 1) return;

    setDbData((prev: FullDatabase) => ({
      ...prev,
      views: prev.views.filter((v: DatabaseView) => v.id !== viewId),
    }));

    const remaining = dbData.views.filter((v: DatabaseView) => v.id !== viewId);
    setActiveViewId(remaining[0]?.id || '');

    await deleteDatabaseView({ data: viewId });
  };

  // Handlers for Form Settings
  const handleUpdateFormSettings = async (formId: string, updates: any) => {
    const updated = await updateFormSettings({
      data: {
        formId,
        updates,
      },
    });

    setDbData((prev: FullDatabase) => ({
      ...prev,
      forms: prev.forms.map((f: DatabaseForm) => (f.id === formId ? { ...f, ...updated } : f)),
    }));
  };

  const handleSubmitTestForm = async (properties: Record<string, any>, title?: string) => {
    if (!activeForm) return;
    const newItem = await submitPublicForm({
      data: {
        shareToken: activeForm.shareToken,
        properties,
        title,
      },
    });

    setDbData((prev: FullDatabase) => ({
      ...prev,
      items: [newItem, ...prev.items],
    }));
  };

  const getViewIcon = (type: string) => {
    const match = VIEW_LAYOUT_OPTIONS.find((opt) => opt.type === type);
    const Icon = match ? match.icon : Table;
    return <Icon className="w-3.5 h-3.5 shrink-0" />;
  };

  return (
    <div className="w-full font-sans text-stone-900 dark:text-zinc-100">
      <EditorHeader
        icon={dbData.database.icon || '📊'}
        title={dbData.database.title || 'Untitled Database'}
        isReadOnly={readOnly}
        isPinned={isPinned}
        togglePinMutation={onTogglePin ? { mutate: onTogglePin } : undefined}
        duplicateMutation={onDuplicate ? { mutate: onDuplicate, isPending: false } : undefined}
        onDelete={onDelete}
      />
      <div className="p-4 space-y-4">

        {/* Database Title Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/80 dark:border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{dbData.database.icon || '📊'}</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-stone-950 dark:text-white">
                {dbData.database.title}
              </h1>
              {dbData.database.description && (
                <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
                  {dbData.database.description}
                </p>
              )}
            </div>
          </div>

          {/* Toolbar Controls */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-200/80 dark:border-zinc-800 bg-stone-50/60 dark:bg-zinc-900/60 text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#1f4d3d] w-40 sm:w-52"
              />
            </div>

            {!readOnly && (
              <button
                onClick={() => handleAddItem()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1f4d3d] hover:bg-[#183e31] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            )}
          </div>
        </div>

        {/* Notion-Style Pill View Switcher Tabs Bar */}
        <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-zinc-800/80 px-1 pt-1 pb-2 overflow-x-auto select-none no-scrollbar">
          <div className="flex items-center gap-1.5 relative">
            {dbData.views.map((view: DatabaseView) => {
              const isActive = view.id === activeView?.id;
              return (
                <div key={view.id} className="relative group flex items-center">
                  <button
                    type="button"
                    onClick={() => setActiveViewId(view.id)}
                    className={clsx(
                      "flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer relative",
                      isActive
                        ? "bg-stone-200/80 dark:bg-zinc-800 text-stone-950 dark:text-white shadow-2xs"
                        : "text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800/50"
                    )}
                  >
                    {getViewIcon(view.type)}
                    <span>{view.name}</span>

                    {isActive && !readOnly && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsConfigDrawerOpen(!isConfigDrawerOpen);
                        }}
                        className="p-0.5 rounded hover:bg-stone-300/60 dark:hover:bg-zinc-700 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 transition-colors ml-1"
                        title="View Options"
                      >
                        <Settings2 className="w-3 h-3" />
                      </span>
                    )}

                    {!readOnly && dbData.views.length > 1 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteView(view.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950/60 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer ml-0.5"
                        title="Delete View"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                </div>
              );
            })}

            {/* Notion + Add View Trigger Button with Tooltip */}
            {!readOnly && (
              <div className="relative">
                <button
                  ref={addViewBtnRef}
                  type="button"
                  onClick={() => setIsViewPopoverOpen(!isViewPopoverOpen)}
                  className="flex items-center justify-center w-7 h-7 text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-200/80 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                  title="Add a new view"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {/* Notion "Add a new view" Grid Popover Menu */}
                <AnimatePresence>
                  {isViewPopoverOpen && (
                    <NewViewPopover
                      isOpen={isViewPopoverOpen}
                      onClose={() => setIsViewPopoverOpen(false)}
                      onSelectLayout={handleCreateView}
                    />
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Main View Display Area */}
        <div className="pt-2">
          {activeView?.type === 'table' && (
            <DatabaseTableView
              properties={dbData.properties}
              items={filteredItems}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onDeleteItemsBulk={handleDeleteItemsBulk}
              onAddItem={handleAddItem}
              onAddProperty={handleAddProperty}
              onDeleteProperty={handleDeleteProperty}
              onConvertPropertyType={handleConvertPropertyType}
              onUpdateProperty={handleUpdateProperty}
              onOpenRowDrawer={(item) => setSelectedDrawerItem(item)}
              readOnly={readOnly}
            />
          )}

          {activeView?.type === 'board' && (
            <DatabaseBoardView
              properties={dbData.properties}
              items={filteredItems}
              groupByPropertyId={activeView.config?.groupByPropertyId}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onAddItem={handleAddItem}
              readOnly={readOnly}
            />
          )}

          {activeView?.type === 'gallery' && (
            <DatabaseGalleryView
              properties={dbData.properties}
              items={filteredItems}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onAddItem={handleAddItem}
              onOpenRowDrawer={(item) => setSelectedDrawerItem(item)}
              readOnly={readOnly}
            />
          )}

          {activeView?.type === 'list' && (
            <DatabaseListView
              properties={dbData.properties}
              items={filteredItems}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onAddItem={handleAddItem}
              onOpenRowDrawer={(item) => setSelectedDrawerItem(item)}
              readOnly={readOnly}
            />
          )}

          {activeView?.type === 'chart' && (
            <DatabaseChartView
              properties={dbData.properties}
              items={filteredItems}
            />
          )}

          {activeView?.type === 'form' && (
            <DatabaseFormView
              form={activeForm}
              properties={dbData.properties}
              onUpdateFormSettings={handleUpdateFormSettings}
              onSubmitTestForm={handleSubmitTestForm}
              readOnly={readOnly}
            />
          )}

          {!['table', 'board', 'gallery', 'list', 'chart', 'form'].includes(activeView?.type || '') && (
            <DatabaseBoardView
              properties={dbData.properties}
              items={filteredItems}
              groupByPropertyId={activeView?.config?.groupByPropertyId}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onAddItem={handleAddItem}
              readOnly={readOnly}
            />
          )}
        </div>

      </div>

      {/* Notion View Configuration Right Drawer */}
      <AnimatePresence>
        {isConfigDrawerOpen && activeView && (
          <ViewConfigDrawer
            isOpen={isConfigDrawerOpen}
            view={activeView}
            properties={dbData.properties}
            onClose={() => setIsConfigDrawerOpen(false)}
            onUpdateView={handleUpdateView}
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
    </div>
  );
}

