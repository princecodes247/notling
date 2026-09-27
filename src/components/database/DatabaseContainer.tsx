import React, { useState, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { DatabaseItem, DatabaseProperty } from '~/db/schema';
import type { FullDatabase } from '~/server/databases.db';
import { DatabaseTableView } from './DatabaseTableView';
import { DatabaseRowDrawer } from './DatabaseRowDrawer';
import {
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
import { useUIStore } from '~/store/uiStore';
import { updateClientPageMeta } from '~/lib/pageMetaSync';
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
  const queryClient = useQueryClient();
  const [dbData, setDbData] = useState<FullDatabase>(initialData);
  const [dbTitle, setDbTitle] = useState(initialData.database.title || 'Untitled Database');
  const savedTitleRef = useRef(initialData.database.title || 'Untitled Database');
  const isEditingTitleRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrawerItem, setSelectedDrawerItem] = useState<DatabaseItem | null>(null);

  React.useEffect(() => {
    setDbData(initialData);
    if (!isEditingTitleRef.current) {
      setDbTitle(initialData.database.title || 'Untitled Database');
      savedTitleRef.current = initialData.database.title || 'Untitled Database';
    }
  }, [initialData.database.id, initialData.database.title]);

  const handleSaveTitle = async () => {
    isEditingTitleRef.current = false;
    const trimmed = dbTitle.trim();
    const finalTitle = trimmed || savedTitleRef.current || 'Untitled Database';

    if (finalTitle === savedTitleRef.current) {
      setDbTitle(finalTitle);
      return;
    }

    savedTitleRef.current = finalTitle;
    setDbTitle(finalTitle);

    setDbData((prev: FullDatabase) => ({
      ...prev,
      database: {
        ...prev.database,
        title: finalTitle,
      },
    }));

    try {
      const { updateTabMeta } = useUIStore.getState();
      updateTabMeta(dbData.database.id, finalTitle, dbData.database.icon || '');
      if (dbData.database.pageId) {
        updateTabMeta(dbData.database.pageId, finalTitle, dbData.database.icon || '');
      }

      await updateDatabase({
        data: {
          databaseId: dbData.database.id,
          updates: { title: finalTitle },
        },
      });
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
    } catch (err) {
      console.error('Failed to update database title:', err);
    }
  };

  const handleRevertTitle = () => {
    isEditingTitleRef.current = false;
    setDbTitle(savedTitleRef.current);
  };

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
      order: dbData.items.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setDbData((prev: FullDatabase) => ({
      ...prev,
      items: [...prev.items, optimisticItem],
    }));

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
        setDbData((prev: FullDatabase) => ({
          ...prev,
          items: prev.items.map((item: DatabaseItem) =>
            item.id === tempId ? { ...item, pageId: res.pageId } : item
          ),
        }));
      }
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

  const handleReorderItems = (fromIndex: number, toIndex: number) => {
    setDbData((prev: FullDatabase) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= prev.items.length || toIndex >= prev.items.length) return prev;
      const newItems = [...prev.items];
      const [moved] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, moved);
      return {
        ...prev,
        items: newItems,
      };
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

  const handleUpdateIcon = async (newIcon: string | null) => {
    const iconValue = newIcon || '';
    setDbData((prev: FullDatabase) => ({
      ...prev,
      database: {
        ...prev.database,
        icon: iconValue,
      },
    }));

    try {
      const { updateTabMeta } = useUIStore.getState();
      updateTabMeta(dbData.database.id, dbTitle, iconValue);
      if (dbData.database.pageId) {
        updateTabMeta(dbData.database.pageId, dbTitle, iconValue);
        updateClientPageMeta(queryClient, { pageId: dbData.database.pageId, title: dbTitle, icon: iconValue });
      }

      await updateDatabase({
        data: {
          databaseId: dbData.database.id,
          updates: { icon: iconValue },
        },
      });
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      queryClient.invalidateQueries({ queryKey: ['database', dbData.database.id] });
    } catch (err) {
      console.error('Failed to update database icon:', err);
    }
  };

  return (
    <div className="w-full font-sans text-stone-900 dark:text-zinc-100 min-h-screen">
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
        onAddItem={() => handleAddItem()}
      />

      {/* Direct Table Content (Borderless, sitting directly on page background) */}
      <div className="py-2 px-4 sm:px-8">
        <DatabaseTableView
          properties={dbData.properties}
          items={filteredItems}
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
    </div>
  );
}

