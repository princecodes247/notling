import { db } from '~/db';
import {
  databases,
  databaseProperties,
  databaseItems,
  databaseViews,
  databaseForms,
  type Database,
  type DatabaseProperty,
  type DatabaseItem,
  type DatabaseView,
  type DatabaseForm,
} from '~/db/schema';
import { eq, asc, desc, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface FullDatabase {
  database: Database;
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  views: DatabaseView[];
  forms: DatabaseForm[];
}

export async function fetchDatabase(databaseId: string): Promise<FullDatabase | null> {
  const [database] = await db.select().from(databases).where(eq(databases.id, databaseId)).limit(1);
  if (!database) return null;

  const properties = await db
    .select()
    .from(databaseProperties)
    .where(eq(databaseProperties.databaseId, databaseId))
    .orderBy(asc(databaseProperties.order));

  const items = await db
    .select()
    .from(databaseItems)
    .where(eq(databaseItems.databaseId, databaseId))
    .orderBy(asc(databaseItems.order), desc(databaseItems.createdAt));

  const views = await db
    .select()
    .from(databaseViews)
    .where(eq(databaseViews.databaseId, databaseId))
    .orderBy(asc(databaseViews.order));

  const forms = await db
    .select()
    .from(databaseForms)
    .where(eq(databaseForms.databaseId, databaseId));

  return {
    database,
    properties,
    items,
    views,
    forms,
  };
}

export async function fetchDatabasesInWorkspace(workspaceId: string): Promise<Database[]> {
  return db.select().from(databases).where(eq(databases.workspaceId, workspaceId)).orderBy(desc(databases.createdAt));
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
  const [database] = await db
    .insert(databases)
    .values({
      workspaceId: input.workspaceId,
      pageId: input.pageId || null,
      title: input.title || 'Projects & Tasks Database',
      icon: '📊',
      inline: input.inline ?? false,
    })
    .returning();

  // Create default properties
  const titlePropId = randomUUID();
  const statusPropId = randomUUID();
  const priorityPropId = randomUUID();
  const tagsPropId = randomUUID();

  const propsToInsert = [
    {
      id: titlePropId,
      databaseId: database.id,
      name: 'Task Name',
      type: 'title' as const,
      options: [],
      order: 0,
    },
    {
      id: statusPropId,
      databaseId: database.id,
      name: 'Status',
      type: 'status' as const,
      options: [
        { id: 'todo', name: 'To Do', color: '#94a3b8' },
        { id: 'in_progress', name: 'In Progress', color: '#3b82f6' },
        { id: 'done', name: 'Done', color: '#22c55e' },
      ],
      order: 1,
    },
    {
      id: priorityPropId,
      databaseId: database.id,
      name: 'Priority',
      type: 'select' as const,
      options: [
        { id: 'low', name: 'Low', color: '#94a3b8' },
        { id: 'medium', name: 'Medium', color: '#eab308' },
        { id: 'high', name: 'High', color: '#ef4444' },
      ],
      order: 2,
    },
    {
      id: tagsPropId,
      databaseId: database.id,
      name: 'Tags',
      type: 'multi_select' as const,
      options: [
        { id: 'feature', name: 'Feature', color: '#8b5cf6' },
        { id: 'bug', name: 'Bug Fix', color: '#f43f5e' },
        { id: 'design', name: 'Design UI', color: '#06b6d4' },
      ],
      order: 3,
    },
  ];

  const insertedProperties = await db.insert(databaseProperties).values(propsToInsert).returning();

  // Sample seed items
  const seedItems = [
    {
      databaseId: database.id,
      title: 'Design initial database component structure',
      properties: {
        [titlePropId]: 'Design initial database component structure',
        [statusPropId]: 'done',
        [priorityPropId]: 'high',
        [tagsPropId]: ['design', 'feature'],
      },
      order: 0,
    },
    {
      databaseId: database.id,
      title: 'Implement Kanban Board & Table views',
      properties: {
        [titlePropId]: 'Implement Kanban Board & Table views',
        [statusPropId]: 'in_progress',
        [priorityPropId]: 'high',
        [tagsPropId]: ['feature'],
      },
      order: 1,
    },
    {
      databaseId: database.id,
      title: 'Add interactive Form view & public submission route',
      properties: {
        [titlePropId]: 'Add interactive Form view & public submission route',
        [statusPropId]: 'in_progress',
        [priorityPropId]: 'medium',
        [tagsPropId]: ['feature'],
      },
      order: 2,
    },
  ];

  const insertedItems = await db.insert(databaseItems).values(seedItems).returning();

  // Create default views
  const viewsToInsert = [
    {
      databaseId: database.id,
      name: 'Table View',
      type: 'table' as const,
      config: {
        visiblePropertyIds: [titlePropId, statusPropId, priorityPropId, tagsPropId],
      },
      order: 0,
    },
    {
      databaseId: database.id,
      name: 'Kanban Board',
      type: 'board' as const,
      config: {
        groupByPropertyId: statusPropId,
        visiblePropertyIds: [titlePropId, priorityPropId, tagsPropId],
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

  // Create default shareable Form
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

  return {
    database,
    properties: insertedProperties,
    items: insertedItems,
    views: insertedViews,
    forms: insertedForms,
  };
}

export async function saveDatabase(databaseId: string, updates: Partial<{ title: string; description: string; icon: string; coverUrl: string }>) {
  const [updated] = await db
    .update(databases)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(databases.id, databaseId))
    .returning();
  return updated;
}

export async function removeDatabase(databaseId: string) {
  await db.delete(databases).where(eq(databases.id, databaseId));
  return { success: true };
}

export async function addDatabaseProperty(databaseId: string, prop: { id?: string; name: string; type: any; options?: any[] }) {
  const existingProps = await db.select().from(databaseProperties).where(eq(databaseProperties.databaseId, databaseId));
  const maxOrder = existingProps.reduce((max, p) => Math.max(max, p.order), -1);

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

  return newProp;
}

export async function updateDatabaseProperty(propertyId: string, updates: Partial<{ name: string; type: any; options: any[]; order: number }>) {
  const [updated] = await db
    .update(databaseProperties)
    .set(updates)
    .where(eq(databaseProperties.id, propertyId))
    .returning();
  return updated;
}

export async function deleteDatabaseProperty(propertyId: string) {
  await db.delete(databaseProperties).where(eq(databaseProperties.id, propertyId));
  return { success: true };
}

export async function addDatabaseItem(databaseId: string, item: { id?: string; title?: string; properties?: Record<string, any> }) {
  const existingItems = await db.select().from(databaseItems).where(eq(databaseItems.databaseId, databaseId));
  const maxOrder = existingItems.reduce((max, i) => Math.max(max, i.order), -1);

  const [newItem] = await db
    .insert(databaseItems)
    .values({
      ...(item.id ? { id: item.id } : {}),
      databaseId,
      title: item.title || 'Untitled',
      properties: item.properties || {},
      order: maxOrder + 1,
    })
    .returning();

  return newItem;
}

export async function updateDatabaseItem(itemId: string, updates: Partial<{ title: string; properties: Record<string, any>; order: number }>) {
  const [updated] = await db
    .update(databaseItems)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(databaseItems.id, itemId))
    .returning();
  return updated;
}

export async function deleteDatabaseItem(itemId: string) {
  await db.delete(databaseItems).where(eq(databaseItems.id, itemId));
  return { success: true };
}

export async function addDatabaseView(databaseId: string, view: { name: string; type: 'table' | 'board' | 'form' | 'list'; config?: any }) {
  const existingViews = await db.select().from(databaseViews).where(eq(databaseViews.databaseId, databaseId));
  const maxOrder = existingViews.reduce((max, v) => Math.max(max, v.order), -1);

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

  return newView;
}

export async function updateDatabaseView(viewId: string, updates: Partial<{ name: string; type: any; config: any; order: number }>) {
  const [updated] = await db
    .update(databaseViews)
    .set(updates)
    .where(eq(databaseViews.id, viewId))
    .returning();
  return updated;
}

export async function deleteDatabaseView(viewId: string) {
  await db.delete(databaseViews).where(eq(databaseViews.id, viewId));
  return { success: true };
}

export async function updateFormSettings(formId: string, updates: Partial<DatabaseForm>) {
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

  // Determine main item title from title property if provided or default
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
  const [updated] = await db
    .update(databaseItems)
    .set({ content, updatedAt: new Date() })
    .where(eq(databaseItems.id, itemId))
    .returning();
  return updated;
}

export async function deleteDatabaseItemsBulk(itemIds: string[]) {
  if (!itemIds.length) return { success: true, count: 0 };
  for (const id of itemIds) {
    await db.delete(databaseItems).where(eq(databaseItems.id, id));
  }
  return { success: true, count: itemIds.length };
}

export async function convertPropertyType(propertyId: string, newType: string) {
  const [prop] = await db.select().from(databaseProperties).where(eq(databaseProperties.id, propertyId)).limit(1);
  if (!prop) throw new Error('Property not found');

  const items = await db.select().from(databaseItems).where(eq(databaseItems.databaseId, prop.databaseId));

  // Perform type conversion on existing row property values
  for (const item of items) {
    const rawVal = item.properties?.[propertyId];
    if (rawVal === undefined || rawVal === null) continue;

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
  }

  const [updatedProp] = await db
    .update(databaseProperties)
    .set({ type: newType as any })
    .where(eq(databaseProperties.id, propertyId))
    .returning();

  return updatedProp;
}

