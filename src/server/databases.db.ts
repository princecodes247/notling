import { db } from '~/db';
import {
  databases,
  databaseProperties,
  databaseItems,
  databaseViews,
  databaseForms,
  pages,
  workspaces,
  workspaceMembers,
  type Database,
  type DatabaseProperty,
  type DatabaseItem,
  type DatabaseView,
  type DatabaseForm,
} from '~/db/schema';
import { eq, asc, desc, and, or, isNull, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { fetchPage, getPageAccessLevel } from './pages.db';
import { getSessionImpl } from './auth.db';
import {
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  redisKeys,
} from './redis';

export interface FullDatabase {
  database: Database;
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  views: DatabaseView[];
  forms: DatabaseForm[];
}

export async function invalidateDatabaseCaches(
  databaseId?: string | null,
  workspaceId?: string | null,
  pageId?: string | null
) {
  const keys: string[] = [];
  if (databaseId) keys.push(redisKeys.database(databaseId));
  if (pageId) keys.push(redisKeys.database(pageId));
  if (workspaceId) {
    keys.push(redisKeys.workspaceDatabases(workspaceId));
    deleteCachePattern(`${redisKeys.workspaceTree(workspaceId)}*`).catch(() => {});
  }
  if (keys.length > 0) {
    await deleteCache(keys);
  }
}

// ---------------------------------------------------------------------------
// Access Control & Permission Enforcement Helpers
// ---------------------------------------------------------------------------

export async function checkDatabaseAccessLevel(databaseId: string): Promise<'editor' | 'viewer' | null> {
  const session = await getSessionImpl();

  const [row] = await db
    .select({
      database: databases,
      page: pages,
    })
    .from(databases)
    .leftJoin(pages, eq(databases.pageId, pages.id))
    .where(or(eq(databases.id, databaseId), eq(databases.pageId, databaseId)))
    .limit(1);

  if (!row || !row.database) {
    const [pageRow] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, databaseId))
      .limit(1);
    if (!pageRow) return null;
    return getPageAccessLevel(pageRow, session);
  }

  const { database, page } = row;
  if (page) {
    return getPageAccessLevel(page, session);
  }

  if (!session) return null;
  const userEmail = session.email?.trim().toLowerCase();
  const [ws, member] = await Promise.all([
    db.select({ ownerId: workspaces.ownerId }).from(workspaces).where(eq(workspaces.id, database.workspaceId)).limit(1),
    userEmail
      ? db
          .select({ role: workspaceMembers.role })
          .from(workspaceMembers)
          .where(and(eq(workspaceMembers.workspaceId, database.workspaceId), or(eq(workspaceMembers.userId, session.userId), eq(workspaceMembers.email, userEmail))))
          .limit(1)
      : Promise.resolve([]),
  ]);

  if ((ws.length > 0 && ws[0].ownerId === session.userId) || member.length > 0 || session.workspaceId === database.workspaceId) {
    return 'editor';
  }

  return null;
}

export async function assertDatabaseEditAccess(databaseId: string): Promise<void> {
  const accessLevel = await checkDatabaseAccessLevel(databaseId);
  if (accessLevel !== 'editor') {
    throw new Error('Unauthorized: You do not have permission to modify this database.');
  }
}

export async function assertDatabaseViewAccess(databaseId: string): Promise<void> {
  const accessLevel = await checkDatabaseAccessLevel(databaseId);
  if (!accessLevel) {
    throw new Error('Unauthorized: You do not have permission to view this database.');
  }
}

export async function assertDatabasePropertyEditAccess(propertyId: string): Promise<string> {
  const [prop] = await db.select({ databaseId: databaseProperties.databaseId }).from(databaseProperties).where(eq(databaseProperties.id, propertyId)).limit(1);
  if (!prop) throw new Error('Database property not found');
  await assertDatabaseEditAccess(prop.databaseId);
  return prop.databaseId;
}

export async function assertDatabaseItemEditAccess(itemId: string): Promise<string> {
  const [item] = await db.select({ databaseId: databaseItems.databaseId }).from(databaseItems).where(eq(databaseItems.id, itemId)).limit(1);
  if (!item) throw new Error('Database item not found');
  await assertDatabaseEditAccess(item.databaseId);
  return item.databaseId;
}

export async function assertDatabaseItemsBulkEditAccess(itemIds: string[]): Promise<void> {
  if (!itemIds || itemIds.length === 0) return;
  const items = await db.select({ databaseId: databaseItems.databaseId }).from(databaseItems).where(inArray(databaseItems.id, itemIds));
  if (items.length === 0) return;
  const dbIds = Array.from(new Set(items.map((i) => i.databaseId)));
  for (const dbId of dbIds) {
    await assertDatabaseEditAccess(dbId);
  }
}

export async function assertDatabaseViewEditAccess(viewId: string): Promise<string> {
  const [view] = await db.select({ databaseId: databaseViews.databaseId }).from(databaseViews).where(eq(databaseViews.id, viewId)).limit(1);
  if (!view) throw new Error('Database view not found');
  await assertDatabaseEditAccess(view.databaseId);
  return view.databaseId;
}

export async function assertDatabaseFormEditAccess(formId: string): Promise<string> {
  const [form] = await db.select({ databaseId: databaseForms.databaseId }).from(databaseForms).where(eq(databaseForms.id, formId)).limit(1);
  if (!form) throw new Error('Database form not found');
  await assertDatabaseEditAccess(form.databaseId);
  return form.databaseId;
}

export async function assertWorkspaceEditAccess(workspaceId: string): Promise<void> {
  const session = await getSessionImpl();
  if (!session) {
    throw new Error('Unauthorized: Login required.');
  }
  const cleanEmail = session.email?.trim().toLowerCase();
  const [ws, member] = await Promise.all([
    db.select({ ownerId: workspaces.ownerId }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1),
    cleanEmail
      ? db
          .select({ role: workspaceMembers.role })
          .from(workspaceMembers)
          .where(and(eq(workspaceMembers.workspaceId, workspaceId), or(eq(workspaceMembers.userId, session.userId), eq(workspaceMembers.email, cleanEmail))))
          .limit(1)
      : Promise.resolve([]),
  ]);

  if ((ws.length > 0 && ws[0].ownerId === session.userId) || member.length > 0 || session.workspaceId === workspaceId) {
    return;
  }

  throw new Error('Unauthorized: You do not have edit access to this workspace.');
}

// ---------------------------------------------------------------------------
// Database Queries and Mutations with Security Assertions
// ---------------------------------------------------------------------------

export async function fetchDatabase(databaseId: string): Promise<FullDatabase | null> {
  const dbCacheKey = redisKeys.database(databaseId);

  // Fast-path: Check Redis cache (< 1ms)
  const cachedDb = await getCache<FullDatabase>(dbCacheKey);
  if (cachedDb) {
    try {
      await assertDatabaseViewAccess(cachedDb.database.id);
      return cachedDb;
    } catch {
      return null;
    }
  }

  const [row] = await db
    .select({
      database: databases,
      isDeleted: pages.isDeleted,
    })
    .from(databases)
    .leftJoin(pages, eq(databases.pageId, pages.id))
    .where(or(eq(databases.id, databaseId), eq(databases.pageId, databaseId)))
    .limit(1);

  if (!row || !row.database || row.isDeleted === true) return null;
  const database = row.database;

  // Access control check
  try {
    await assertDatabaseViewAccess(database.id);
  } catch {
    return null;
  }

  const [properties, items, views, forms] = await Promise.all([
    db
      .select()
      .from(databaseProperties)
      .where(eq(databaseProperties.databaseId, database.id))
      .orderBy(asc(databaseProperties.order)),
    db
      .select()
      .from(databaseItems)
      .where(eq(databaseItems.databaseId, database.id))
      .orderBy(asc(databaseItems.order), desc(databaseItems.createdAt)),
    db
      .select()
      .from(databaseViews)
      .where(eq(databaseViews.databaseId, database.id))
      .orderBy(asc(databaseViews.order)),
    db
      .select()
      .from(databaseForms)
      .where(eq(databaseForms.databaseId, database.id)),
  ]);

  const fullDb: FullDatabase = {
    database,
    properties,
    items,
    views,
    forms,
  };

  // Cache in Redis for fast access (30 min TTL)
  setCache(redisKeys.database(database.id), fullDb, 1800).catch(() => {});
  if (database.pageId) {
    setCache(redisKeys.database(database.pageId), fullDb, 1800).catch(() => {});
  }

  return fullDb;
}

export async function fetchDatabasesInWorkspace(workspaceId: string): Promise<Database[]> {
  try {
    await assertWorkspaceEditAccess(workspaceId);
  } catch {
    return [];
  }

  const wsDbsCacheKey = redisKeys.workspaceDatabases(workspaceId);
  const cachedList = await getCache<Database[]>(wsDbsCacheKey);
  if (cachedList) {
    return cachedList;
  }

  const rows = await db
    .select({ database: databases })
    .from(databases)
    .leftJoin(pages, eq(databases.pageId, pages.id))
    .where(
      and(
        eq(databases.workspaceId, workspaceId),
        or(isNull(pages.isDeleted), eq(pages.isDeleted, false))
      )
    )
    .orderBy(desc(databases.createdAt));
  const result = rows.map((r) => r.database);

  setCache(wsDbsCacheKey, result, 600).catch(() => {});

  return result;
}

export async function fetchPublicFormByToken(shareToken: string) {
  const [form] = await db.select().from(databaseForms).where(eq(databaseForms.shareToken, shareToken)).limit(1);
  if (!form || !form.isPublic) return null;

  const [database] = await db.select().from(databases).where(eq(databases.id, form.databaseId)).limit(1);
  if (!database) return null;

  const properties = await db
    .select()
    .from(databaseProperties)
    .where(eq(databaseProperties.databaseId, database.id))
    .orderBy(asc(databaseProperties.order));

  return {
    form,
    database: {
      id: database.id,
      title: database.title,
      description: database.description,
      icon: database.icon,
      coverUrl: database.coverUrl,
    },
    properties,
  };
}

export async function createNewDatabase(input: {
  workspaceId: string;
  pageId?: string | null;
  title?: string;
  inline?: boolean;
}): Promise<FullDatabase> {
  await assertWorkspaceEditAccess(input.workspaceId);

  let targetPageId = input.pageId || null;

  if (!targetPageId && !input.inline) {
    const { pages } = await import('~/db/schema');
    const [newPage] = await db
      .insert(pages)
      .values({
        workspaceId: input.workspaceId,
        title: input.title || 'Untitled Database',
        icon: '',
      })
      .returning();
    targetPageId = newPage.id;
  }

  const [database] = await db
    .insert(databases)
    .values({
      workspaceId: input.workspaceId,
      pageId: targetPageId,
      title: input.title || 'Untitled Database',
      icon: '',
      inline: input.inline ?? false,
    })
    .returning();

  const titlePropId = randomUUID();

  const propsToInsert = [
    {
      id: titlePropId,
      databaseId: database.id,
      name: 'Name',
      type: 'title' as const,
      options: [],
      order: 0,
    },
  ];

  const insertedProperties = await db.insert(databaseProperties).values(propsToInsert).returning();
  const insertedItems: DatabaseItem[] = [];

  const viewsToInsert = [
    {
      databaseId: database.id,
      name: 'Table View',
      type: 'table' as const,
      config: {
        visiblePropertyIds: [titlePropId],
      },
      order: 0,
    },
    {
      databaseId: database.id,
      name: 'Kanban Board',
      type: 'board' as const,
      config: {
        groupByPropertyId: null,
        visiblePropertyIds: [titlePropId],
      },
      order: 1,
    },
    {
      databaseId: database.id,
      name: 'Form View',
      type: 'form' as const,
      config: {
        submitButtonText: 'Submit Task',
        successMessage: 'Thank you! Your task entry has been submitted to the database.',
      },
      order: 2,
    },
  ];

  const insertedViews = await db.insert(databaseViews).values(viewsToInsert).returning();

  const shareToken = randomUUID().replace(/-/g, '').slice(0, 16);
  const formToInsert = {
    databaseId: database.id,
    viewId: insertedViews.find((v) => v.type === 'form')?.id || null,
    title: database.title,
    description: 'Fill out this form to add a new record to the database.',
    shareToken,
    isPublic: true,
    settings: {
      headerColor: 'from-blue-600 to-indigo-600',
      submitButtonText: 'Submit Response',
      successMessage: 'Thank you! Your response has been recorded successfully.',
      requiredPropertyIds: [titlePropId],
    },
  };

  const insertedForms = await db.insert(databaseForms).values(formToInsert).returning();

  invalidateDatabaseCaches(database.id, input.workspaceId, targetPageId).catch(() => {});

  return {
    database,
    properties: insertedProperties,
    items: insertedItems,
    views: insertedViews,
    forms: insertedForms,
  };
}

export async function saveDatabase(databaseId: string, updates: Partial<{ title: string; description: string; icon: string | null; coverUrl: string }>) {
  await assertDatabaseEditAccess(databaseId);

  const [updated] = await db
    .update(databases)
    .set({ ...updates, updatedAt: new Date() })
    .where(or(eq(databases.id, databaseId), eq(databases.pageId, databaseId)))
    .returning();

  const targetPageId = updated?.pageId || databaseId;
  const { pages } = await import('~/db/schema');
  await db
    .update(pages)
    .set({
      ...(updates.title !== undefined ? { title: updates.title } : {}),
      ...(updates.icon !== undefined ? { icon: updates.icon } : {}),
      updatedAt: new Date(),
    })
    .where(eq(pages.id, targetPageId));

  invalidateDatabaseCaches(databaseId, null, targetPageId).catch(() => {});

  return updated;
}

export async function removeDatabase(databaseId: string) {
  await assertDatabaseEditAccess(databaseId);
  await db.delete(databases).where(eq(databases.id, databaseId));
  invalidateDatabaseCaches(databaseId).catch(() => {});
  return { success: true };
}

export async function addDatabaseProperty(databaseId: string, prop: { id?: string; name: string; type: any; options?: any[] }) {
  await assertDatabaseEditAccess(databaseId);

  const [lastProp] = await db
    .select({ order: databaseProperties.order })
    .from(databaseProperties)
    .where(eq(databaseProperties.databaseId, databaseId))
    .orderBy(desc(databaseProperties.order))
    .limit(1);
  const maxOrder = lastProp ? lastProp.order : -1;

  const [newProp] = await db
    .insert(databaseProperties)
    .values({
      ...(prop.id ? { id: prop.id } : {}),
      databaseId,
      name: prop.name || 'New Field',
      type: prop.type || 'text',
      options: prop.options || [],
      order: maxOrder + 1,
    })
    .returning();

  invalidateDatabaseCaches(databaseId).catch(() => {});

  return newProp;
}

export async function updateDatabaseProperty(
  propertyId: string,
  updates: Partial<{ name: string; type: any; options: any[]; order: number; icon: string | null }>
) {
  const databaseId = await assertDatabasePropertyEditAccess(propertyId);

  const [updated] = await db
    .update(databaseProperties)
    .set(updates)
    .where(eq(databaseProperties.id, propertyId))
    .returning();

  invalidateDatabaseCaches(databaseId).catch(() => {});
  return updated;
}

export async function deleteDatabaseProperty(propertyId: string) {
  const databaseId = await assertDatabasePropertyEditAccess(propertyId);

  await db.delete(databaseProperties).where(eq(databaseProperties.id, propertyId));
  invalidateDatabaseCaches(databaseId).catch(() => {});
  return { success: true };
}

export async function getOrCreateDatabaseItemPage(itemId: string) {
  await assertDatabaseItemEditAccess(itemId);

  const [item] = await db.select().from(databaseItems).where(eq(databaseItems.id, itemId)).limit(1);
  if (!item) return null;

  let pageId = item.pageId;
  if (!pageId) {
    const [database] = await db.select().from(databases).where(eq(databases.id, item.databaseId)).limit(1);
    if (database) {
      const [newPage] = await db
        .insert(pages)
        .values({
          workspaceId: database.workspaceId,
          parentId: database.pageId || null,
          title: item.title || 'Untitled',
          icon: null,
          visibility: 'workspace',
          order: item.order || 0,
        })
        .returning();
      pageId = newPage.id;
      await db.update(databaseItems).set({ pageId: newPage.id }).where(eq(databaseItems.id, itemId));
    }
  }

  if (!pageId) return null;
  return fetchPage(pageId);
}

export async function addDatabaseItem(databaseId: string, item: { id?: string; title?: string; properties?: Record<string, any>; pageId?: string }) {
  await assertDatabaseEditAccess(databaseId);

  const [lastItem] = await db
    .select({ order: databaseItems.order })
    .from(databaseItems)
    .where(eq(databaseItems.databaseId, databaseId))
    .orderBy(desc(databaseItems.order))
    .limit(1);
  const maxOrder = lastItem ? lastItem.order : -1;

  const [dbInfo] = await db.select({ workspaceId: databases.workspaceId, pageId: databases.pageId }).from(databases).where(eq(databases.id, databaseId)).limit(1);

  let targetPageId = item.pageId || null;
  if (!targetPageId && dbInfo) {
    const [createdPage] = await db
      .insert(pages)
      .values({
        workspaceId: dbInfo.workspaceId,
        parentId: dbInfo.pageId || null,
        title: item.title !== undefined && item.title !== '' ? item.title : 'Untitled',
        icon: null,
        visibility: 'workspace',
        order: maxOrder + 1,
      })
      .returning();
    targetPageId = createdPage.id;
  }

  const [newItem] = await db
    .insert(databaseItems)
    .values({
      ...(item.id ? { id: item.id } : {}),
      databaseId,
      pageId: targetPageId,
      title: item.title !== undefined ? item.title : '',
      properties: item.properties || {},
      order: maxOrder + 1,
    })
    .returning();

  invalidateDatabaseCaches(databaseId).catch(() => {});

  return newItem;
}

export async function updateDatabaseItem(itemId: string, updates: Partial<{ title: string; properties: Record<string, any>; order: number }>) {
  const databaseId = await assertDatabaseItemEditAccess(itemId);

  const [updated] = await db
    .update(databaseItems)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(databaseItems.id, itemId))
    .returning();

  if (updated && updated.pageId && updates.title !== undefined) {
    await db.update(pages).set({ title: updates.title || 'Untitled', updatedAt: new Date() }).where(eq(pages.id, updated.pageId));
  }

  invalidateDatabaseCaches(databaseId).catch(() => {});
  return updated;
}

export async function deleteDatabaseItem(itemId: string) {
  const databaseId = await assertDatabaseItemEditAccess(itemId);

  const [item] = await db.select({ pageId: databaseItems.pageId }).from(databaseItems).where(eq(databaseItems.id, itemId)).limit(1);
  if (item?.pageId) {
    await db.update(pages).set({ isDeleted: true, updatedAt: new Date() }).where(eq(pages.id, item.pageId));
  }
  await db.delete(databaseItems).where(eq(databaseItems.id, itemId));
  invalidateDatabaseCaches(databaseId).catch(() => {});
  return { success: true };
}

export async function addDatabaseView(databaseId: string, view: { name: string; type: string; config?: any }) {
  await assertDatabaseEditAccess(databaseId);

  const [lastView] = await db
    .select({ order: databaseViews.order })
    .from(databaseViews)
    .where(eq(databaseViews.databaseId, databaseId))
    .orderBy(desc(databaseViews.order))
    .limit(1);
  const maxOrder = lastView ? lastView.order : -1;

  const [newView] = await db
    .insert(databaseViews)
    .values({
      databaseId,
      name: view.name,
      type: view.type,
      config: view.config || {},
      order: maxOrder + 1,
    })
    .returning();

  invalidateDatabaseCaches(databaseId).catch(() => {});

  return newView;
}

export async function updateDatabaseView(viewId: string, updates: Partial<{ name: string; type: any; config: any; order: number }>) {
  const databaseId = await assertDatabaseViewEditAccess(viewId);

  const [updated] = await db
    .update(databaseViews)
    .set(updates)
    .where(eq(databaseViews.id, viewId))
    .returning();

  invalidateDatabaseCaches(databaseId).catch(() => {});
  return updated;
}

export async function deleteDatabaseView(viewId: string) {
  const databaseId = await assertDatabaseViewEditAccess(viewId);

  await db.delete(databaseViews).where(eq(databaseViews.id, viewId));
  invalidateDatabaseCaches(databaseId).catch(() => {});
  return { success: true };
}

export async function updateFormSettings(formId: string, updates: Partial<DatabaseForm>) {
  await assertDatabaseFormEditAccess(formId);

  const [updated] = await db
    .update(databaseForms)
    .set(updates)
    .where(eq(databaseForms.id, formId))
    .returning();
  return updated;
}

export async function submitFormResponse(shareToken: string, properties: Record<string, any>, title?: string) {
  const [form] = await db.select().from(databaseForms).where(eq(databaseForms.shareToken, shareToken)).limit(1);
  if (!form || !form.isPublic) {
    throw new Error('Form not found or is inactive');
  }

  const [titleProperty] = await db
    .select()
    .from(databaseProperties)
    .where(and(eq(databaseProperties.databaseId, form.databaseId), eq(databaseProperties.type, 'title')))
    .limit(1);

  let itemTitle = title || 'Form Submission';
  if (titleProperty && properties[titleProperty.id]) {
    itemTitle = String(properties[titleProperty.id]);
  }

  const [newItem] = await db
    .insert(databaseItems)
    .values({
      databaseId: form.databaseId,
      title: itemTitle,
      properties: properties,
    })
    .returning();

  return newItem;
}

export async function saveDatabaseItemContent(itemId: string, content: any[]) {
  await assertDatabaseItemEditAccess(itemId);

  const [updated] = await db
    .update(databaseItems)
    .set({ content, updatedAt: new Date() })
    .where(eq(databaseItems.id, itemId))
    .returning();
  return updated;
}

export async function deleteDatabaseItemsBulk(itemIds: string[]) {
  if (!itemIds.length) return { success: true, count: 0 };
  await assertDatabaseItemsBulkEditAccess(itemIds);

  await db.delete(databaseItems).where(inArray(databaseItems.id, itemIds));
  return { success: true, count: itemIds.length };
}

export async function convertPropertyType(propertyId: string, newType: string) {
  await assertDatabasePropertyEditAccess(propertyId);

  const [prop] = await db.select().from(databaseProperties).where(eq(databaseProperties.id, propertyId)).limit(1);
  if (!prop) throw new Error('Property not found');

  const items = await db.select().from(databaseItems).where(eq(databaseItems.databaseId, prop.databaseId));

  const updates = items.map(async (item) => {
    const rawVal = item.properties?.[propertyId];
    if (rawVal === undefined || rawVal === null) return;

    let convertedVal: any = rawVal;
    if (newType === 'number') {
      const num = Number(rawVal);
      convertedVal = !isNaN(num) ? num : null;
    } else if (newType === 'text' || newType === 'url' || newType === 'email') {
      convertedVal = String(rawVal);
    } else if (newType === 'checkbox') {
      convertedVal = Boolean(rawVal);
    } else if (newType === 'multi_select') {
      convertedVal = Array.isArray(rawVal) ? rawVal : [String(rawVal)];
    } else if (newType === 'select' || newType === 'status') {
      convertedVal = Array.isArray(rawVal) ? rawVal[0] : String(rawVal);
    }

    await db
      .update(databaseItems)
      .set({
        properties: {
          ...item.properties,
          [propertyId]: convertedVal,
        },
      })
      .where(eq(databaseItems.id, item.id));
  });

  await Promise.all(updates);

  const [updatedProp] = await db
    .update(databaseProperties)
    .set({ type: newType as any })
    .where(eq(databaseProperties.id, propertyId))
    .returning();

  invalidateDatabaseCaches(prop.databaseId).catch(() => {});

  return updatedProp;
}
