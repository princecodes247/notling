import React, { useState, useMemo } from 'react';
import type { FullDatabase, DatabaseItem, DatabaseProperty } from '~/db/schema';
import { DatabaseTableView } from './DatabaseTableView';
import { DatabaseBoardView } from './DatabaseBoardView';
import { DatabaseFormView } from './DatabaseFormView';
import { DatabaseRowDrawer } from './DatabaseRowDrawer';
import {
  Table,
  Kanban,
  FileText,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Sparkles,
} from 'lucide-react';
import {
  updateDatabase,
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

interface DatabaseContainerProps {
  initialData: FullDatabase;
  readOnly?: boolean;
}

export function DatabaseContainer({ initialData, readOnly = false }: DatabaseContainerProps) {
  const [dbData, setDbData] = useState<FullDatabase>(initialData);
  const [activeViewId, setActiveViewId] = useState<string>(
    initialData.views[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [addingView, setAddingView] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [newViewType, setNewViewType] = useState<'table' | 'board' | 'form'>('table');
  const [selectedDrawerItem, setSelectedDrawerItem] = useState<DatabaseItem | null>(null);

  const activeView = useMemo(
    () => dbData.views.find((v) => v.id === activeViewId) || dbData.views[0],
    [dbData.views, activeViewId]
  );

  const activeForm = useMemo(() => dbData.forms[0], [dbData.forms]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return dbData.items;
    const q = searchQuery.toLowerCase();
    return dbData.items.filter((item) => {
      if (item.title.toLowerCase().includes(q)) return true;
      return Object.values(item.properties || {}).some(
        (val) => typeof val === 'string' && val.toLowerCase().includes(q)
      );
    });
  }, [dbData.items, searchQuery]);

  // Handlers for Items (100% Optimistic)
  const handleAddItem = async (initialProps: Record<string, any> = {}) => {
    const tempId = crypto.randomUUID();
    const titleProp = dbData.properties.find((p) => p.type === 'title');
    const defaultTitle = 'Untitled';
    const mergedProps = {
      ...(titleProp ? { [titleProp.id]: defaultTitle } : {}),
      ...initialProps,
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

    // Immediately update client state (0ms latency!)
    setDbData((prev) => ({
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
  };

  const handleUpdateItem = async (itemId: string, updates: { title?: string; properties?: Record<string, any> }) => {
    setDbData((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
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
    setDbData((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== itemId),
    }));

    await deleteDatabaseItem({ data: itemId });
  };

  const handleDeleteItemsBulk = async (itemIds: string[]) => {
    setDbData((prev) => ({
      ...prev,
      items: prev.items.filter((i) => !itemIds.includes(i.id)),
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
    };

    // Immediately update client state (0ms latency!)
    setDbData((prev) => ({
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
    setDbData((prev) => ({
      ...prev,
      properties: prev.properties.map((p) => (p.id === propertyId ? { ...p, ...updates } : p)),
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

    setDbData((prev) => ({
      ...prev,
      properties: prev.properties.map((p) => (p.id === propertyId ? { ...p, type: updatedProp.type } : p)),
    }));
  };

  const handleDeleteProperty = async (propertyId: string) => {
    setDbData((prev) => ({
      ...prev,
      properties: prev.properties.filter((p) => p.id !== propertyId),
    }));

    await deleteDatabaseProperty({ data: propertyId });
  };

  // Handlers for Views
  const handleAddViewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newViewName.trim()) return;

    const newView = await createDatabaseView({
      data: {
        databaseId: dbData.database.id,
        name: newViewName.trim(),
        type: newViewType,
      },
    });

    setDbData((prev) => ({
      ...prev,
      views: [...prev.views, newView],
    }));

    setActiveViewId(newView.id);
    setNewViewName('');
    setAddingView(false);
  };

  const handleDeleteView = async (viewId: string) => {
    if (dbData.views.length <= 1) return;

    setDbData((prev) => ({
      ...prev,
      views: prev.views.filter((v) => v.id !== viewId),
    }));

    const remaining = dbData.views.filter((v) => v.id !== viewId);
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

    setDbData((prev) => ({
      ...prev,
      forms: prev.forms.map((f) => (f.id === formId ? { ...f, ...updated } : f)),
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

    setDbData((prev) => ({
      ...prev,
      items: [newItem, ...prev.items],
    }));
  };

  return (
    <div className="w-full space-y-4 font-sans text-stone-900 dark:text-zinc-100">
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

      {/* View Switcher Tabs Bar */}
      <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-zinc-800/80 pb-1 overflow-x-auto select-none">
        <div className="flex items-center gap-1">
          {dbData.views.map((view) => {
            const isActive = view.id === activeView?.id;
            return (
              <div key={view.id} className="relative group flex items-center">
                <button
                  onClick={() => setActiveViewId(view.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${isActive ? 'bg-stone-200/80 dark:bg-zinc-800 text-stone-950 dark:text-white font-semibold' : 'text-stone-600 dark:text-zinc-400 hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-zinc-800/50'}`}
                >
                  {view.type === 'table' && <Table className="w-3.5 h-3.5 text-blue-500" />}
                  {view.type === 'board' && <Kanban className="w-3.5 h-3.5 text-purple-500" />}
                  {view.type === 'form' && <FileText className="w-3.5 h-3.5 text-emerald-500" />}
                  <span>{view.name}</span>
                </button>

                {!readOnly && dbData.views.length > 1 && (
                  <button
                    onClick={() => handleDeleteView(view.id)}
                    className="opacity-0 group-hover:opacity-100 ml-0.5 p-1 text-stone-400 hover:text-rose-500 transition-opacity"
                    title="Delete View"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add View Button */}
          {!readOnly && (
            <div>
              {addingView ? (
                <form onSubmit={handleAddViewSubmit} className="flex items-center gap-1 pl-2">
                  <input
                    type="text"
                    placeholder="View name..."
                    value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                    className="px-2 py-1 text-xs border rounded-md bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-700 text-stone-900 dark:text-zinc-100"
                    autoFocus
                  />
                  <select
                    value={newViewType}
                    onChange={(e) => setNewViewType(e.target.value as any)}
                    className="px-1.5 py-1 text-xs border rounded-md bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-700 text-stone-800 dark:text-zinc-200"
                  >
                    <option value="table">Table</option>
                    <option value="board">Board</option>
                    <option value="form">Form</option>
                  </select>
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-xs bg-[#1f4d3d] text-white rounded-md font-medium"
                  >
                    Add
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setAddingView(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add View</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main View Area */}
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

        {activeView?.type === 'form' && (
          <DatabaseFormView
            form={activeForm}
            properties={dbData.properties}
            onUpdateFormSettings={handleUpdateFormSettings}
            onSubmitTestForm={handleSubmitTestForm}
            readOnly={readOnly}
          />
        )}
      </div>

      {/* Row Page Drawer Modal (Req #10) */}
      {selectedDrawerItem && (
        <DatabaseRowDrawer
          item={selectedDrawerItem}
          properties={dbData.properties}
          onClose={() => setSelectedDrawerItem(null)}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
