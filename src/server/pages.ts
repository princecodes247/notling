import { createServerFn } from '@tanstack/react-start';

export interface PageTreeNode {
  id: string;
  workspaceId: string;
  parentId: string | null;
  title: string;
  icon: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  contentText?: string | null;
  children: PageTreeNode[];
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

export const createPage = createServerFn({ method: 'POST' })
  .validator((input: { workspaceId: string; parentId?: string | null; title?: string; icon?: string }) => input)
  .handler(async ({ data }: { data: { workspaceId: string; parentId?: string | null; title?: string; icon?: string } }) => {
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
