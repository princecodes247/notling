import { createServerFn } from '@tanstack/react-start';

export interface PageTreeNode {
  id: string;
  workspaceId: string;
  parentId: string | null;
  title: string;
  icon: string | null;
  visibility: 'private' | 'workspace' | 'public';
  order: number;
  createdAt: Date;
  updatedAt: Date;
  contentText?: string | null;
  children: PageTreeNode[];
  isShared?: boolean;
}

// TanStack Start Server Functions
export const getPageTree = createServerFn({ method: 'GET' })
  .validator((workspaceId: string) => workspaceId)
  .handler(async ({ data }: { data: string }) => {
    const { fetchPageTree } = await import('./pages.db');
    return fetchPageTree(data);
  });

export const getPage = createServerFn({ method: 'GET' })
  .validator((pageId: string) => pageId)
  .handler(async ({ data }: { data: string }) => {
    const { fetchPage } = await import('./pages.db');
    return fetchPage(data);
  });

export const getPublicPage = createServerFn({ method: 'GET' })
  .validator((pageId: string) => pageId)
  .handler(async ({ data }: { data: string }) => {
    const { fetchPublicPage } = await import('./pages.db');
    return fetchPublicPage(data);
  });

export const createPage = createServerFn({ method: 'POST' })
  .validator((input: { workspaceId: string; parentId?: string | null; title?: string; icon?: string; visibility?: 'private' | 'workspace' | 'public' }) => input)
  .handler(async ({ data }: { data: { workspaceId: string; parentId?: string | null; title?: string; icon?: string; visibility?: 'private' | 'workspace' | 'public' } }) => {
    const { createNewPage } = await import('./pages.db');
    return createNewPage(data);
  });

export const updatePageContent = createServerFn({ method: 'POST' })
  .validator((input: { pageId: string; content: any; contentText: string }) => input)
  .handler(async ({ data }: { data: { pageId: string; content: any; contentText: string } }) => {
    const { savePageContent } = await import('./pages.db');
    return savePageContent(data);
  });

export const updatePageMeta = createServerFn({ method: 'POST' })
  .validator((input: { pageId: string; title?: string; icon?: string | null }) => input)
  .handler(async ({ data }: { data: { pageId: string; title?: string; icon?: string | null } }) => {
    const { savePageMeta } = await import('./pages.db');
    return savePageMeta(data);
  });

export const updatePageVisibility = createServerFn({ method: 'POST' })
  .validator((input: { pageId: string; visibility: 'private' | 'workspace' | 'public' }) => input)
  .handler(async ({ data }: { data: { pageId: string; visibility: 'private' | 'workspace' | 'public' } }) => {
    const { savePageVisibility } = await import('./pages.db');
    return savePageVisibility(data);
  });

export const softDeletePage = createServerFn({ method: 'POST' })
  .validator((pageId: string) => pageId)
  .handler(async ({ data }: { data: string }) => {
    const { performSoftDelete } = await import('./pages.db');
    return performSoftDelete(data);
  });

export const restorePage = createServerFn({ method: 'POST' })
  .validator((pageId: string) => pageId)
  .handler(async ({ data }: { data: string }) => {
    const { performRestore } = await import('./pages.db');
    return performRestore(data);
  });

export const getTrashPages = createServerFn({ method: 'GET' })
  .validator((workspaceId: string) => workspaceId)
  .handler(async ({ data }: { data: string }) => {
    const { fetchTrashPages } = await import('./pages.db');
    return fetchTrashPages(data);
  });

export const permanentDeletePage = createServerFn({ method: 'POST' })
  .validator((pageId: string) => pageId)
  .handler(async ({ data }: { data: string }) => {
    const { performPermanentDelete } = await import('./pages.db');
    return performPermanentDelete(data);
  });

export const searchPages = createServerFn({ method: 'GET' })
  .validator((input: { workspaceId: string; query: string }) => input)
  .handler(async ({ data }: { data: { workspaceId: string; query: string } }) => {
    const { performSearchPages } = await import('./pages.db');
    return performSearchPages(data.workspaceId, data.query);
  });

export const getChildPages = createServerFn({ method: 'GET' })
  .validator((parentId: string) => parentId)
  .handler(async ({ data }: { data: string }) => {
    const { fetchChildPages } = await import('./pages.db');
    return fetchChildPages(data);
  });

export const getPageShares = createServerFn({ method: 'GET' })
  .validator((pageId: string) => pageId)
  .handler(async ({ data }: { data: string }) => {
    const { fetchPageShares } = await import('./pages.db');
    return fetchPageShares(data);
  });

export const inviteUserToPage = createServerFn({ method: 'POST' })
  .validator((input: { pageId: string; email: string; role: 'viewer' | 'editor' }) => input)
  .handler(async ({ data }: { data: { pageId: string; email: string; role: 'viewer' | 'editor' } }) => {
    const { inviteUserToPage: inviteImpl } = await import('./pages.db');
    return inviteImpl(data);
  });

export const removePageShare = createServerFn({ method: 'POST' })
  .validator((shareId: string) => shareId)
  .handler(async ({ data }: { data: string }) => {
    const { removePageShare: removeImpl } = await import('./pages.db');
    return removeImpl(data);
  });

export const updatePageShareRole = createServerFn({ method: 'POST' })
  .validator((input: { shareId: string; role: 'viewer' | 'editor' }) => input)
  .handler(async ({ data }: { data: { shareId: string; role: 'viewer' | 'editor' } }) => {
    const { updatePageShareRole: updateRoleImpl } = await import('./pages.db');
    return updateRoleImpl(data);
  });

export const pingPagePresence = createServerFn({ method: 'POST' })
  .validator((input: { pageId: string; role: 'viewer' | 'editor'; clientId?: string; guestName?: string }) => input)
  .handler(async ({ data }: { data: { pageId: string; role: 'viewer' | 'editor'; clientId?: string; guestName?: string } }) => {
    const { recordPagePresence } = await import('./pages.db');
    return recordPagePresence(data);
  });

export const getActivePresence = createServerFn({ method: 'GET' })
  .validator((pageId: string) => pageId)
  .handler(async ({ data }: { data: string }) => {
    const { fetchActivePresence } = await import('./pages.db');
    return fetchActivePresence(data);
  });

