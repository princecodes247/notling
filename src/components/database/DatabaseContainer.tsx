import React, { useState, useMemo } from 'react';
import type { FullDatabase, DatabaseProperty, DatabaseItem, DatabaseView, DatabaseForm } from '~/db/schema';
import { DatabaseTableView } from './DatabaseTableView';
import { DatabaseBoardView } from './DatabaseBoardView';
import { DatabaseFormView } from './DatabaseFormView';
import {
  Table,
  Kanban,
  FileText,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  Sparkles,
  Trash2,
  Share2,
} from 'lucide-react';
import {
  updateDatabase,
  createDatabaseProperty,
  deleteDatabaseProperty,
  createDatabaseItem,
  updateDatabaseItem,
  deleteDatabaseItem,
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

  const activeView = useMemo(
    () => dbData.views.find((v) => v.id === activeViewId) || dbData.views[0],
    [dbData.views, activeViewId]
  );

  const activeForm = useMemo(() => dbData.forms[0], [dbData.forms]);

  // Search filtering
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

  // Handlers for Items
  const handleAddItem = async (initialProps: Record<string, any> = {}) => {
    const titleProp = dbData.properties.find((p) => p.type === 'title');
    const defaultTitle = 'New Item';
    const mergedProps = {
      ...(titleProp ? { [titleProp.id]: defaultTitle } : {}),
      ...initialProps,
    };

    const newItem = await createDatabaseItem({
      data: {
        databaseId: dbData.database.id,
        title: defaultTitle,
        properties: mergedProps,
      },
    });

    setDbData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const handleUpdateItem = async (itemId: string, updates: { title?: string; properties?: Record<string, any> }) => {
    // Optimistic UI update
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

  // Handlers for Properties
  const handleAddProperty = async (name: string, type: string) => {
    const newProp = await createDatabaseProperty({
      data: {
        databaseId: dbData.database.id,
        name,
        type,
      },
    });

    setDbData((prev) => ({
      ...prev,
      properties: [...prev.properties, newProp],
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
    <div className="w-full space-y-4 my-4 font-sans text-neutral-900 dark:text-neutral-100">
      {/* Database Title & Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{dbData.database.icon || '📊'}</span>
          <div>
            <h2 className="text-lg font-bold tracking-tight leading-none">
              {dbData.database.title}
            </h2>
            {dbData.database.description && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {dbData.database.description}
              </p>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Filter database..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44 md:w-56"
            />
          </div>

          {!readOnly && (
            <button
              onClick={() => handleAddItem()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          )}
        </div>
      </div>

      {/* View Tabs Bar */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-1 overflow-x-auto">
        <div className="flex items-center gap-1">
          {dbData.views.map((view) => {
            const isActive = view.id === activeView?.id;
            return (
              <div key={view.id} className="relative group flex items-center">
                <button
                  onClick={() => setActiveViewId(view.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${isActive ? 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/50'}`}
                >
                  {view.type === 'table' && <Table className="w-3.5 h-3.5 text-blue-500" />}
                  {view.type === 'board' && <Kanban className="w-3.5 h-3.5 text-purple-500" />}
                  {view.type === 'form' && <FileText className="w-3.5 h-3.5 text-emerald-500" />}
                  <span>{view.name}</span>
                </button>

                {!readOnly && dbData.views.length > 1 && (
                  <button
                    onClick={() => handleDeleteView(view.id)}
                    className="opacity-0 group-hover:opacity-100 ml-0.5 p-1 text-neutral-400 hover:text-red-500 transition-opacity"
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
                <form onSubmit={handleAddViewSubmit} className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="View name..."
                    value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                    className="px-2 py-1 text-xs border rounded bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700"
                    autoFocus
                  />
                  <select
                    value={newViewType}
                    onChange={(e) => setNewViewType(e.target.value as any)}
                    className="px-1.5 py-1 text-xs border rounded bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700"
                  >
                    <option value="table">Table</option>
                    <option value="board">Board</option>
                    <option value="form">Form</option>
                  </select>
                  <button
                    type="submit"
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded font-medium"
                  >
                    Add
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setAddingView(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
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
            onAddItem={handleAddItem}
            onAddProperty={handleAddProperty}
            onDeleteProperty={handleDeleteProperty}
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
    </div>
  );
}
