import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, index, foreignKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash'),
  role: text('role'),
  isOnboarded: boolean('is_onboarded').notNull().default(false),
  provider: text('provider', { enum: ['email', 'google', 'github', 'dev'] }).notNull().default('dev'),
  providerAccountId: text('provider_account_id').notNull().default('dev'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull().default('My Workspace'),
  slug: text('slug').notNull().unique(),
  publicHomeDocId: uuid('public_home_doc_id'),
  icon: text('icon').default('🚀'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const workspaceCustomDomains = pgTable('workspace_custom_domains', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  domain: text('domain').notNull().unique(),
  status: text('status', { enum: ['pending', 'verified', 'invalid'] }).notNull().default('pending'),
  dnsTarget: text('dns_target').notNull().default('cname.notling.app'),
  dnsRecordType: text('dns_record_type').notNull().default('CNAME'),
  verifiedAt: timestamp('verified_at'),
  lastCheckedAt: timestamp('last_checked_at'),
  errorMessage: text('error_message'),
  publicHomeDocId: uuid('public_home_doc_id'),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ([
  index('workspace_custom_domains_ws_idx').on(table.workspaceId),
  index('workspace_custom_domains_domain_idx').on(table.domain),
]));

export type WorkspaceCustomDomain = typeof workspaceCustomDomains.$inferSelect;
export type NewWorkspaceCustomDomain = typeof workspaceCustomDomains.$inferInsert;

export const pages = pgTable('pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  parentId: uuid('parent_id'),
  title: text('title').notNull().default('Untitled'),
  icon: text('icon'),
  visibility: text('visibility', { enum: ['private', 'workspace', 'public', 'public_edit'] }).notNull().default('workspace'),
  content: jsonb('content').$type<any[]>().notNull().default([]),
  contentText: text('content_text'),
  order: integer('order').notNull().default(0),
  isPinned: boolean('is_pinned').notNull().default(false),
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ([
  foreignKey({ columns: [table.parentId], foreignColumns: [table.id] }).onDelete('cascade'),
  index('pages_parent_idx').on(table.parentId),
  index('pages_workspace_deleted_idx').on(table.workspaceId, table.isDeleted),
  index('pages_search_idx').using(
    'gin',
    sql`to_tsvector('english', coalesce(${table.title}, '') || ' ' || coalesce(${table.contentText}, ''))`
  ),
]));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;

export const pageShares = pgTable('page_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').references(() => pages.id, { onDelete: 'cascade' }).notNull(),
  email: text('email').notNull(),
  role: text('role', { enum: ['viewer', 'editor'] }).notNull().default('viewer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type PageShare = typeof pageShares.$inferSelect;
export type NewPageShare = typeof pageShares.$inferInsert;

export const pagePresence = pgTable('page_presence', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').references(() => pages.id, { onDelete: 'cascade' }).notNull(),
  email: text('email').notNull(),
  name: text('name'),
  role: text('role', { enum: ['viewer', 'editor'] }).notNull().default('viewer'),
  lastPing: timestamp('last_ping').defaultNow().notNull(),
});

export type PagePresence = typeof pagePresence.$inferSelect;
export type NewPagePresence = typeof pagePresence.$inferInsert;

export const uploads = pgTable('uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(),
  url: text('url').notNull(),
  sizeBytes: integer('size_bytes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Upload = typeof uploads.$inferSelect;
export type NewUpload = typeof uploads.$inferInsert;

export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role', { enum: ['owner', 'admin', 'member'] }).notNull().default('member'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;

export const pageViews = pgTable('page_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  pageId: uuid('page_id').references(() => pages.id, { onDelete: 'cascade' }).notNull(),
  viewedAt: timestamp('viewed_at').defaultNow().notNull(),
}, (table) => ({
  userPageIdx: index('page_views_user_page_idx').on(table.userId, table.pageId),
}));

export type PageView = typeof pageViews.$inferSelect;
export type NewPageView = typeof pageViews.$inferInsert;

export const pageHistory = pgTable('page_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').references(() => pages.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  userEmail: text('user_email'),
  userName: text('user_name'),
  userAvatarUrl: text('user_avatar_url'),
  title: text('title'),
  content: jsonb('content').$type<any[]>().notNull().default([]),
  delta: jsonb('delta').$type<{ added?: any[]; updated?: any[]; deleted?: string[] }>(),
  changeSummary: text('change_summary'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pageIdx: index('page_history_page_idx').on(table.pageId, table.createdAt),
}));

export type PageHistory = typeof pageHistory.$inferSelect;
export type NewPageHistory = typeof pageHistory.$inferInsert;

export const pageUpdates = pgTable('page_updates', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').references(() => pages.id, { onDelete: 'cascade' }).notNull(),
  updateData: text('update_data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pageIdx: index('page_updates_page_idx').on(table.pageId, table.createdAt),
}));

export type PageUpdate = typeof pageUpdates.$inferSelect;
export type NewPageUpdate = typeof pageUpdates.$inferInsert;

export const pageAccessRequests = pgTable('page_access_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').references(() => pages.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  name: text('name'),
  requestedRole: text('requested_role', { enum: ['editor', 'viewer'] }).notNull().default('editor'),
  note: text('note'),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  pageUserIdx: index('page_access_requests_page_user_idx').on(table.pageId, table.email),
}));

export type PageAccessRequest = typeof pageAccessRequests.$inferSelect;
export type NewPageAccessRequest = typeof pageAccessRequests.$inferInsert;

export const databases = pgTable('databases', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  pageId: uuid('page_id').references(() => pages.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('Untitled Database'),
  description: text('description'),
  icon: text('icon').default(''),
  coverUrl: text('cover_url'),
  inline: boolean('inline').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  workspaceIdx: index('databases_workspace_idx').on(table.workspaceId),
  pageIdx: index('databases_page_idx').on(table.pageId),
}));

export type Database = typeof databases.$inferSelect;
export type NewDatabase = typeof databases.$inferInsert;

export interface RelationConfig {
  targetDatabaseId: string;
  targetDatabaseTitle?: string;
  targetDatabaseIcon?: string;
  twoWay?: boolean;
  twoWayPropertyId?: string;
  twoWayPropertyName?: string;
  limit?: 'single' | 'multiple';
}

export const databaseProperties = pgTable('database_properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  databaseId: uuid('database_id').references(() => databases.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull().default('New Property'),
  type: text('type', {
    enum: ['title', 'text', 'number', 'select', 'multi_select', 'date', 'checkbox', 'url', 'email', 'status', 'created_at', 'relation']
  }).notNull().default('text'),
  options: jsonb('options').$type<Array<{ id: string; name: string; color: string }>>().notNull().default([]),
  config: jsonb('config').$type<RelationConfig | Record<string, any>>().default({}),
  order: integer('order').notNull().default(0),
  icon: text('icon'),
}, (table) => ({
  databaseOrderIdx: index('database_properties_db_order_idx').on(table.databaseId, table.order),
}));

export type DatabaseProperty = typeof databaseProperties.$inferSelect;
export type NewDatabaseProperty = typeof databaseProperties.$inferInsert;

export const databaseItems = pgTable('database_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  databaseId: uuid('database_id').references(() => databases.id, { onDelete: 'cascade' }).notNull(),
  pageId: uuid('page_id').references(() => pages.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('Untitled'),
  properties: jsonb('properties').$type<Record<string, any>>().notNull().default({}),
  content: jsonb('content').$type<any[]>().notNull().default([]),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  databaseOrderIdx: index('database_items_db_order_idx').on(table.databaseId, table.order),
  databaseCreatedIdx: index('database_items_db_created_idx').on(table.databaseId, table.createdAt),
  databaseUpdatedIdx: index('database_items_db_updated_idx').on(table.databaseId, table.updatedAt),
  pageIdx: index('database_items_page_idx').on(table.pageId),
}));

export type DatabaseItem = typeof databaseItems.$inferSelect;
export type NewDatabaseItem = typeof databaseItems.$inferInsert;

export const databaseViews = pgTable('database_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  databaseId: uuid('database_id').references(() => databases.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull().default('Table'),
  type: text('type').notNull().default('table'),
  config: jsonb('config').$type<Record<string, any>>().notNull().default({}),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  databaseOrderIdx: index('database_views_db_order_idx').on(table.databaseId, table.order),
}));

export type DatabaseView = typeof databaseViews.$inferSelect;
export type NewDatabaseView = typeof databaseViews.$inferInsert;

export const databaseForms = pgTable('database_forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  databaseId: uuid('database_id').references(() => databases.id, { onDelete: 'cascade' }).notNull(),
  viewId: uuid('view_id').references(() => databaseViews.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('Submit Form'),
  description: text('description'),
  shareToken: text('share_token').notNull().unique(),
  isPublic: boolean('is_public').notNull().default(true),
  settings: jsonb('settings').$type<{
    headerColor?: string;
    submitButtonText?: string;
    successMessage?: string;
    hiddenPropertyIds?: string[];
    requiredPropertyIds?: string[];
  }>().notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  databaseIdx: index('database_forms_db_idx').on(table.databaseId),
}));

export type DatabaseForm = typeof databaseForms.$inferSelect;
export type NewDatabaseForm = typeof databaseForms.$inferInsert;




