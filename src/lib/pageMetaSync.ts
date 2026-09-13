import type { QueryClient } from '@tanstack/react-query';
import { useUIStore } from '~/store/uiStore';
import type { PageTreeNode } from '~/server/pages';
import type { Page } from '~/db/schema';

export interface SyncPageMetaPayload {
  pageId: string;
  title?: string;
  icon?: string | null;
}

/**
 * Synchronously updates page title and icon everywhere across the client:
 * 1. Zustand store (`pageMeta` overrides, `openTabs`, and browser `document.title`).
 * 2. TanStack Query cache (`pageTree`, `page`, `publicPage`, `childPages`, `trashPages`, `search`).
 * 3. Dispatches a window `page-meta-updated` custom event for any listeners.
 *
 * This guarantees instantaneous reflection in the UI BEFORE any API call is performed.
 */
export function updateClientPageMeta(
  queryClient: QueryClient | undefined,
  { pageId, title, icon }: SyncPageMetaPayload
) {
  // 1. Instantly update Zustand store (updates pageMeta, openTabs, and document.title if active)
  useUIStore.getState().setPageMeta(pageId, { title, icon });

  // 2. If TanStack Query client is provided, optimistically update all relevant query caches
  if (queryClient) {
    // 2a. Optimistically update ['pageTree'] across any workspace queries
    const updateTreeNodes = (nodes: PageTreeNode[]): PageTreeNode[] => {
      let hasChanged = false;
      const updated = nodes.map((node) => {
        let newNode = node;
        if (node.id === pageId) {
          hasChanged = true;
          newNode = {
            ...node,
            ...(title !== undefined ? { title } : {}),
            ...(icon !== undefined ? { icon } : {}),
          };
        }
        if (node.children && node.children.length > 0) {
          const updatedChildren = updateTreeNodes(node.children);
          if (updatedChildren !== node.children) {
            hasChanged = true;
            newNode = { ...newNode, children: updatedChildren };
          }
        }
        return newNode;
      });
      return hasChanged ? updated : nodes;
    };

    queryClient.setQueriesData<PageTreeNode[]>(
      { queryKey: ['pageTree'] },
      (old) => (old && Array.isArray(old) ? updateTreeNodes(old) : old)
    );

    // 2b. Optimistically update ['page', pageId]
    queryClient.setQueryData<Page>(
      ['page', pageId],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          ...(title !== undefined ? { title } : {}),
          ...(icon !== undefined ? { icon } : {}),
        };
      }
    );

    // 2c. Optimistically update ['publicPage', pageId]
    queryClient.setQueryData(
      ['publicPage', pageId],
      (old: any) => {
        if (!old) return old;
        return {
          ...old,
          page: old.page
            ? {
                ...old.page,
                ...(title !== undefined ? { title } : {}),
                ...(icon !== undefined ? { icon } : {}),
              }
            : old.page,
        };
      }
    );

    // 2d. Optimistically update ['childPages']
    queryClient.setQueriesData<Page[]>(
      { queryKey: ['childPages'] },
      (old) => {
        if (!old || !Array.isArray(old)) return old;
        let changed = false;
        const updated = old.map((item) => {
          if (item.id === pageId) {
            changed = true;
            return {
              ...item,
              ...(title !== undefined ? { title } : {}),
              ...(icon !== undefined ? { icon } : {}),
            };
          }
          return item;
        });
        return changed ? updated : old;
      }
    );

    // 2e. Optimistically update ['trashPages']
    queryClient.setQueriesData<Page[]>(
      { queryKey: ['trashPages'] },
      (old) => {
        if (!old || !Array.isArray(old)) return old;
        let changed = false;
        const updated = old.map((item) => {
          if (item.id === pageId) {
            changed = true;
            return {
              ...item,
              ...(title !== undefined ? { title } : {}),
              ...(icon !== undefined ? { icon } : {}),
            };
          }
          return item;
        });
        return changed ? updated : old;
      }
    );

    // 2f. Optimistically update ['pages', 'search']
    queryClient.setQueriesData<any[]>(
      { queryKey: ['pages', 'search'] },
      (old) => {
        if (!old || !Array.isArray(old)) return old;
        let changed = false;
        const updated = old.map((item) => {
          if (item.id === pageId) {
            changed = true;
            return {
              ...item,
              ...(title !== undefined ? { title } : {}),
              ...(icon !== undefined ? { icon } : {}),
            };
          }
          return item;
        });
        return changed ? updated : old;
      }
    );
  }

  // 3. Dispatch custom window event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('page-meta-updated', {
        detail: { pageId, title, icon },
      })
    );
  }
}
