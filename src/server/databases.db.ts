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
import { eq, asc, desc, and, or, isNull, inArray, ilike, sql } from 'drizzle-orm';
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
  totalCount?: number;
  hasMore?: boolean;
}

export interface FetchDatabaseItemsResult {
  items: DatabaseItem[];
  nextCursor: number | null;
  totalCount: number;
  hasMore: boolean;
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

  const [properties, rawItems, views, forms, countRes] = await Promise.all([
    db
      .select()
      .from(databaseProperties)
      .where(eq(databaseProperties.databaseId, database.id))
      .orderBy(asc(databaseProperties.order)),
    db
      .select({
        id: databaseItems.id,
        databaseId: databaseItems.databaseId,
        pageId: databaseItems.pageId,
        title: databaseItems.title,
        properties: databaseItems.properties,
        order: databaseItems.order,
        createdAt: databaseItems.createdAt,
        updatedAt: databaseItems.updatedAt,
      })
      .from(databaseItems)
      .where(eq(databaseItems.databaseId, database.id))
      .orderBy(asc(databaseItems.order), desc(databaseItems.createdAt))
      .limit(200),
    db
      .select()
      .from(databaseViews)
      .where(eq(databaseViews.databaseId, database.id))
      .orderBy(asc(databaseViews.order)),
    db
      .select()
      .from(databaseForms)
      .where(eq(databaseForms.databaseId, database.id)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(databaseItems)
      .where(eq(databaseItems.databaseId, database.id)),
  ]);

  const totalCount = countRes[0]?.count ?? rawItems.length;
  const items: DatabaseItem[] = rawItems.map((item) => ({
    ...item,
    content: [],
  }));

  const fullDb: FullDatabase = {
    database,
    properties,
    items,
    views,
    forms,
    totalCount,
    hasMore: totalCount > items.length,
  };

  // Cache in Redis for fast access (30 min TTL)
  setCache(redisKeys.database(database.id), fullDb, 1800).catch(() => {});
  if (database.pageId) {
    setCache(redisKeys.database(database.pageId), fullDb, 1800).catch(() => {});
  }

  return fullDb;
}

export async function fetchDatabaseItems(input: {
  databaseId: string;
  offset?: number;
  limit?: number;
  searchQuery?: string;
}): Promise<FetchDatabaseItemsResult> {
  const { databaseId, offset = 0, limit = 200, searchQuery } = input;
  await assertDatabaseViewAccess(databaseId);

  const cleanQuery = searchQuery?.trim();

  const whereClause = cleanQuery
    ? and(
        eq(databaseItems.databaseId, databaseId),
        or(
          ilike(databaseItems.title, `%${cleanQuery}%`),
          sql`${databaseItems.properties}::text ILIKE ${'%' + cleanQuery + '%'}`
        )
      )
    : eq(databaseItems.databaseId, databaseId);

  const [countRes, rawItems] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(databaseItems)
      .where(whereClause),
    db
      .select({
        id: databaseItems.id,
        databaseId: databaseItems.databaseId,
        pageId: databaseItems.pageId,
        title: databaseItems.title,
        properties: databaseItems.properties,
        order: databaseItems.order,
        createdAt: databaseItems.createdAt,
        updatedAt: databaseItems.updatedAt,
      })
      .from(databaseItems)
      .where(whereClause)
      .orderBy(asc(databaseItems.order), desc(databaseItems.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const totalCount = countRes[0]?.count ?? 0;
  const items: DatabaseItem[] = rawItems.map((item) => ({
    ...item,
    content: [],
  }));

  const hasMore = offset + items.length < totalCount;
  const nextCursor = hasMore ? offset + items.length : null;

  return {
    items,
    nextCursor,
    totalCount,
    hasMore,
  };
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

  // Retrieve item details to clean up associated pages and invalidate cache
  const items = await db
    .select({ databaseId: databaseItems.databaseId, pageId: databaseItems.pageId })
    .from(databaseItems)
    .where(inArray(databaseItems.id, itemIds));

  const pageIds = items.map((i) => i.pageId).filter(Boolean) as string[];
  const dbIds = Array.from(new Set(items.map((i) => i.databaseId)));

  const CHUNK_SIZE = 500;
  if (pageIds.length > 0) {
    for (let i = 0; i < pageIds.length; i += CHUNK_SIZE) {
      const chunk = pageIds.slice(i, i + CHUNK_SIZE);
      await db.update(pages).set({ isDeleted: true, updatedAt: new Date() }).where(inArray(pages.id, chunk));
    }
  }

  for (let i = 0; i < itemIds.length; i += CHUNK_SIZE) {
    const chunk = itemIds.slice(i, i + CHUNK_SIZE);
    await db.delete(databaseItems).where(inArray(databaseItems.id, chunk));
  }

  for (const dbId of dbIds) {
    invalidateDatabaseCaches(dbId).catch(() => {});
  }

  return { success: true, count: itemIds.length };
}

export async function convertPropertyType(propertyId: string, newType: string) {
  await assertDatabasePropertyEditAccess(propertyId);

  const [prop] = await db.select().from(databaseProperties).where(eq(databaseProperties.id, propertyId)).limit(1);
  if (!prop) throw new Error('Property not found');

  const items = await db
    .select({ id: databaseItems.id, properties: databaseItems.properties })
    .from(databaseItems)
    .where(eq(databaseItems.databaseId, prop.databaseId));

  // Batch process updates in chunks of 100 to avoid overloading pool connections
  const CHUNK_SIZE = 100;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const updates = chunk.map(async (item) => {
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
  }

  const [updatedProp] = await db
    .update(databaseProperties)
    .set({ type: newType as any })
    .where(eq(databaseProperties.id, propertyId))
    .returning();

  invalidateDatabaseCaches(prop.databaseId).catch(() => {});

  return updatedProp;
}

export interface DatabaseImportMapping {
  columnName: string;
  targetPropertyId: string; // existing property ID, '__TITLE__', '__NEW__', or '__SKIP__'
  newPropertyName?: string;
  newPropertyType?: 'title' | 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url' | 'email';
}

const OPTION_COLORS = ['blue', 'green', 'yellow', 'red', 'purple', 'pink', 'gray', 'orange'];

export async function importDatabaseData(input: {
  databaseId: string;
  mappings: DatabaseImportMapping[];
  rows: Record<string, any>[];
}) {
  const { databaseId, mappings, rows } = input;
  if (!rows || rows.length === 0) {
    return { success: true, count: 0, propertiesCount: 0 };
  }

  await assertDatabaseEditAccess(databaseId);

  const [database] = await db.select().from(databases).where(eq(databases.id, databaseId)).limit(1);
  if (!database) {
    throw new Error('Database not found');
  }

  const existingProps = await db
    .select()
    .from(databaseProperties)
    .where(eq(databaseProperties.databaseId, databaseId))
    .orderBy(databaseProperties.order);

  const titleProp = existingProps.find((p) => p.type === 'title');
  let currentMaxOrder = existingProps.reduce((max, p) => Math.max(max, p.order || 0), -1);

  // Property ID mapping: colName -> targetPropertyId (or '__TITLE__')
  const colToPropMap: Record<string, { propertyId: string; type: string; isTitle: boolean }> = {};
  const propsToCreate: Array<{
    id: string;
    databaseId: string;
    name: string;
    type: any;
    options: Array<{ id: string; name: string; color: string }>;
    order: number;
  }> = [];

  const existingPropMap = new Map(existingProps.map((p) => [p.id, p]));
  const propOptionUpdates: Map<string, Array<{ id: string; name: string; color: string }>> = new Map();

  for (const mapping of mappings) {
    const { columnName, targetPropertyId, newPropertyName, newPropertyType } = mapping;

    if (!targetPropertyId || targetPropertyId === '__SKIP__') {
      continue;
    }

    if (targetPropertyId === '__TITLE__') {
      colToPropMap[columnName] = {
        propertyId: titleProp ? titleProp.id : '__TITLE__',
        type: 'title',
        isTitle: true,
      };
      continue;
    }

    if (targetPropertyId === '__NEW__') {
      const propId = randomUUID();
      const propName = (newPropertyName || columnName).trim() || 'New Property';
      const propType = newPropertyType || 'text';

      let options: Array<{ id: string; name: string; color: string }> = [];
      if (propType === 'select' || propType === 'multi_select') {
        const optionSet = new Set<string>();
        rows.forEach((r) => {
          const val = r[columnName];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            if (propType === 'multi_select') {
              String(val)
                .split(/[,;]/)
                .map((s) => s.trim())
                .filter(Boolean)
                .forEach((v) => optionSet.add(v));
            } else {
              optionSet.add(String(val).trim());
            }
          }
        });

        let colorIdx = 0;
        options = Array.from(optionSet).map((optName) => ({
          id: randomUUID(),
          name: optName,
          color: OPTION_COLORS[colorIdx++ % OPTION_COLORS.length],
        }));
      }

      currentMaxOrder++;
      propsToCreate.push({
        id: propId,
        databaseId,
        name: propName,
        type: propType,
        options,
        order: currentMaxOrder,
      });

      colToPropMap[columnName] = {
        propertyId: propId,
        type: propType,
        isTitle: false,
      };
    } else {
      // Existing property
      const prop = existingPropMap.get(targetPropertyId);
      if (prop) {
        colToPropMap[columnName] = {
          propertyId: prop.id,
          type: prop.type,
          isTitle: prop.type === 'title',
        };

        // If select / multi_select, check if we need to auto-add new options
        if (prop.type === 'select' || prop.type === 'multi_select') {
          const currentOptions = [...(prop.options || [])];
          const existingNames = new Set(currentOptions.map((o) => o.name.toLowerCase()));
          let colorIdx = currentOptions.length;
          let added = false;

          rows.forEach((r) => {
            const val = r[columnName];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              const rawOpts =
                prop.type === 'multi_select'
                  ? String(val)
                      .split(/[,;]/)
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : [String(val).trim()];

              rawOpts.forEach((optName) => {
                if (!existingNames.has(optName.toLowerCase())) {
                  existingNames.add(optName.toLowerCase());
                  currentOptions.push({
                    id: randomUUID(),
                    name: optName,
                    color: OPTION_COLORS[colorIdx++ % OPTION_COLORS.length],
                  });
                  added = true;
                }
              });
            }
          });

          if (added) {
            propOptionUpdates.set(prop.id, currentOptions);
          }
        }
      }
    }
  }

  // Insert new properties
  if (propsToCreate.length > 0) {
    await db.insert(databaseProperties).values(propsToCreate);
  }

  // Update existing properties with new options if any
  for (const [propId, updatedOptions] of propOptionUpdates.entries()) {
    await db
      .update(databaseProperties)
      .set({ options: updatedOptions })
      .where(eq(databaseProperties.id, propId));
  }

  // Get current max order of items
  const [lastItem] = await db
    .select({ order: databaseItems.order })
    .from(databaseItems)
    .where(eq(databaseItems.databaseId, databaseId))
    .orderBy(desc(databaseItems.order))
    .limit(1);
  let itemOrder = (lastItem?.order ?? -1) + 1;

  // Process rows and batch insert pages & database items in chunks of 500
  const CHUNK_SIZE = 500;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);

    const pagesToInsert: Array<{
      id: string;
      workspaceId: string;
      parentId: string | null;
      title: string;
      icon: null;
      visibility: 'workspace';
      order: number;
    }> = [];

    const itemsToInsert: Array<{
      id: string;
      databaseId: string;
      pageId: string;
      title: string;
      properties: Record<string, any>;
      order: number;
    }> = [];

    for (const row of chunk) {
      let rowTitle = '';
      const properties: Record<string, any> = {};

      for (const [colName, mapInfo] of Object.entries(colToPropMap)) {
        const rawValue = row[colName];
        if (rawValue === undefined || rawValue === null || rawValue === '') {
          continue;
        }

        if (mapInfo.isTitle) {
          rowTitle = String(rawValue).trim();
          if (mapInfo.propertyId && mapInfo.propertyId !== '__TITLE__') {
            properties[mapInfo.propertyId] = rowTitle;
          }
          continue;
        }

        // Format property value according to type
        let formattedValue: any = rawValue;
        if (mapInfo.type === 'number') {
          const num = Number(String(rawValue).replace(/[\$,%]/g, ''));
          formattedValue = !isNaN(num) ? num : null;
        } else if (mapInfo.type === 'checkbox') {
          const lower = String(rawValue).toLowerCase().trim();
          formattedValue = ['true', 'yes', '1', '✓'].includes(lower);
        } else if (mapInfo.type === 'multi_select') {
          if (Array.isArray(rawValue)) {
            formattedValue = rawValue.map((v) => String(v).trim()).filter(Boolean);
          } else {
            formattedValue = String(rawValue)
              .split(/[,;]/)
              .map((v) => v.trim())
              .filter(Boolean);
          }
        } else if (mapInfo.type === 'select') {
          formattedValue = String(rawValue).trim();
        } else if (mapInfo.type === 'date') {
          const parsedDate = new Date(rawValue);
          formattedValue = !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : String(rawValue).trim();
        } else {
          formattedValue = String(rawValue).trim();
        }

        properties[mapInfo.propertyId] = formattedValue;
      }

      const itemId = randomUUID();
      const pageId = randomUUID();
      const finalTitle = rowTitle || 'Untitled';

      pagesToInsert.push({
        id: pageId,
        workspaceId: database.workspaceId,
        parentId: database.pageId || null,
        title: finalTitle,
        icon: null,
        visibility: 'workspace',
        order: itemOrder,
      });

      itemsToInsert.push({
        id: itemId,
        databaseId,
        pageId,
        title: finalTitle,
        properties,
        order: itemOrder,
      });

      itemOrder++;
    }

    if (pagesToInsert.length > 0) {
      await db.insert(pages).values(pagesToInsert);
    }
    if (itemsToInsert.length > 0) {
      await db.insert(databaseItems).values(itemsToInsert);
    }
  }

  invalidateDatabaseCaches(databaseId, database.workspaceId, database.pageId).catch(() => {});

  return {
    success: true,
    count: rows.length,
    propertiesCount: propsToCreate.length,
  };
}

