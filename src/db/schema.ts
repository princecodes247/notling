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
  icon: text('icon').default('🚀'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

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
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  parentFk: foreignKey({ columns: [table.parentId], foreignColumns: [table.id] }).onDelete('cascade'),
  searchIdx: index('pages_search_idx').using(
    'gin',
    sql`to_tsvector('english', coalesce(${table.title}, '') || ' ' || coalesce(${table.contentText}, ''))`
  ),
}));

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

