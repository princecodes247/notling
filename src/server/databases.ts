import { createServerFn } from '@tanstack/react-start';

export const getDatabase = createServerFn({ method: 'GET' })
  .validator((databaseId: string) => databaseId)
  .handler(async ({ data }: { data: string }) => {
    const { fetchDatabase } = await import('./databases.db');
    return fetchDatabase(data);
  });

export const getDatabasesInWorkspace = createServerFn({ method: 'GET' })
  .validator((workspaceId: string) => workspaceId)
  .handler(async ({ data }: { data: string }) => {
    const { fetchDatabasesInWorkspace } = await import('./databases.db');
    return fetchDatabasesInWorkspace(data);
  });

export const getPublicFormByToken = createServerFn({ method: 'GET' })
  .validator((shareToken: string) => shareToken)
  .handler(async ({ data }: { data: string }) => {
    const { fetchPublicFormByToken } = await import('./databases.db');
    return fetchPublicFormByToken(data);
  });

export const createDatabase = createServerFn({ method: 'POST' })
  .validator((input: { workspaceId: string; pageId?: string | null; title?: string; inline?: boolean }) => input)
  .handler(async ({ data }: { data: { workspaceId: string; pageId?: string | null; title?: string; inline?: boolean } }) => {
    const { createNewDatabase } = await import('./databases.db');
    return createNewDatabase(data);
  });

export const updateDatabase = createServerFn({ method: 'POST' })
  .validator((input: { databaseId: string; updates: { title?: string; description?: string; icon?: string; coverUrl?: string } }) => input)
  .handler(async ({ data }: { data: { databaseId: string; updates: { title?: string; description?: string; icon?: string; coverUrl?: string } } }) => {
    const { saveDatabase } = await import('./databases.db');
    return saveDatabase(data.databaseId, data.updates);
  });

export const deleteDatabase = createServerFn({ method: 'POST' })
  .validator((databaseId: string) => databaseId)
  .handler(async ({ data }: { data: string }) => {
    const { removeDatabase } = await import('./databases.db');
    return removeDatabase(data);
  });

export const createDatabaseProperty = createServerFn({ method: 'POST' })
  .validator((input: { databaseId: string; name: string; type: string; options?: any[] }) => input)
  .handler(async ({ data }: { data: { databaseId: string; name: string; type: string; options?: any[] } }) => {
    const { addDatabaseProperty } = await import('./databases.db');
    return addDatabaseProperty(data.databaseId, data);
  });

export const updateDatabaseProperty = createServerFn({ method: 'POST' })
  .validator((input: { propertyId: string; updates: { name?: string; type?: string; options?: any[]; order?: number } }) => input)
  .handler(async ({ data }: { data: { propertyId: string; updates: { name?: string; type?: string; options?: any[]; order?: number } } }) => {
    const { updateDatabaseProperty } = await import('./databases.db');
    return updateDatabaseProperty(data.propertyId, data.updates);
  });

export const deleteDatabaseProperty = createServerFn({ method: 'POST' })
  .validator((propertyId: string) => propertyId)
  .handler(async ({ data }: { data: string }) => {
    const { deleteDatabaseProperty } = await import('./databases.db');
    return deleteDatabaseProperty(data);
  });

export const createDatabaseItem = createServerFn({ method: 'POST' })
  .validator((input: { databaseId: string; title?: string; properties?: Record<string, any> }) => input)
  .handler(async ({ data }: { data: { databaseId: string; title?: string; properties?: Record<string, any> } }) => {
    const { addDatabaseItem } = await import('./databases.db');
    return addDatabaseItem(data.databaseId, data);
  });

export const updateDatabaseItem = createServerFn({ method: 'POST' })
  .validator((input: { itemId: string; updates: { title?: string; properties?: Record<string, any>; order?: number } }) => input)
  .handler(async ({ data }: { data: { itemId: string; updates: { title?: string; properties?: Record<string, any>; order?: number } } }) => {
    const { updateDatabaseItem } = await import('./databases.db');
    return updateDatabaseItem(data.itemId, data.updates);
  });

export const deleteDatabaseItem = createServerFn({ method: 'POST' })
  .validator((itemId: string) => itemId)
  .handler(async ({ data }: { data: string }) => {
    const { deleteDatabaseItem } = await import('./databases.db');
    return deleteDatabaseItem(data);
  });

export const createDatabaseView = createServerFn({ method: 'POST' })
  .validator((input: { databaseId: string; name: string; type: 'table' | 'board' | 'form' | 'list'; config?: any }) => input)
  .handler(async ({ data }: { data: { databaseId: string; name: string; type: 'table' | 'board' | 'form' | 'list'; config?: any } }) => {
    const { addDatabaseView } = await import('./databases.db');
    return addDatabaseView(data.databaseId, data);
  });

export const updateDatabaseView = createServerFn({ method: 'POST' })
  .validator((input: { viewId: string; updates: { name?: string; type?: string; config?: any; order?: number } }) => input)
  .handler(async ({ data }: { data: { viewId: string; updates: { name?: string; type?: string; config?: any; order?: number } } }) => {
    const { updateDatabaseView } = await import('./databases.db');
    return updateDatabaseView(data.viewId, data.updates);
  });

export const deleteDatabaseView = createServerFn({ method: 'POST' })
  .validator((viewId: string) => viewId)
  .handler(async ({ data }: { data: string }) => {
    const { deleteDatabaseView } = await import('./databases.db');
    return deleteDatabaseView(data);
  });

export const updateFormSettings = createServerFn({ method: 'POST' })
  .validator((input: { formId: string; updates: any }) => input)
  .handler(async ({ data }: { data: { formId: string; updates: any } }) => {
    const { updateFormSettings } = await import('./databases.db');
    return updateFormSettings(data.formId, data.updates);
  });

export const submitPublicForm = createServerFn({ method: 'POST' })
  .validator((input: { shareToken: string; properties: Record<string, any>; title?: string }) => input)
  .handler(async ({ data }: { data: { shareToken: string; properties: Record<string, any>; title?: string } }) => {
    const { submitFormResponse } = await import('./databases.db');
    return submitFormResponse(data.shareToken, data.properties, data.title);
  });
