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

    // 2g. Optimistically update ['database']
    queryClient.setQueriesData<any>(
      { queryKey: ['database'] },
      (old: any) => {
        if (!old || !old.database) return old;
        if (old.database.id === pageId || old.database.pageId === pageId) {
          if (old.database.id && old.database.id !== pageId) {
            useUIStore.getState().setPageMeta(old.database.id, { title, icon });
          }
          if (old.database.pageId && old.database.pageId !== pageId) {
            useUIStore.getState().setPageMeta(old.database.pageId, { title, icon });
          }

          return {
            ...old,
            database: {
              ...old.database,
              ...(title !== undefined ? { title } : {}),
              ...(icon !== undefined ? { icon } : {}),
            },
          };
        }
        return old;
      }
    );

    // 2h. Optimistically update ['databases']
    queryClient.setQueriesData<any[]>(
      { queryKey: ['databases'] },
      (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        let changed = false;
        const updated = old.map((dbItem) => {
          if (dbItem.id === pageId || dbItem.pageId === pageId) {
            changed = true;
            return {
              ...dbItem,
              ...(title !== undefined ? { title } : {}),
              ...(icon !== undefined ? { icon } : {}),
            };
          }
          return dbItem;
        });
        return changed ? updated : old;
      }
    );

    // 2i. Optimistically update ['databasesList']
    queryClient.setQueriesData<any[]>(
      { queryKey: ['databasesList'] },
      (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        let changed = false;
        const updated = old.map((dbItem) => {
          if (dbItem.id === pageId || dbItem.pageId === pageId) {
            changed = true;
            return {
              ...dbItem,
              ...(title !== undefined ? { title } : {}),
              ...(icon !== undefined ? { icon } : {}),
            };
          }
          return dbItem;
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

import { clearOfflineDraft } from '~/lib/offlineStorage';

/**
 * Helper to clean up all persisted localStorage artifacts related to a deleted page or database ID.
 */
function cleanPersistedStorageForId(id: string) {
  if (typeof window === 'undefined' || !id) return;
  try {
    clearOfflineDraft(id);
    localStorage.removeItem(`notling_offline_draft_${id}`);
    localStorage.removeItem(`notling_presence_${id}`);
    localStorage.removeItem(`notling_active_page_${id}`);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(`notling_offline_draft_${id}`) || key.endsWith(`_${id}`))) {
        localStorage.removeItem(key);
      }
    }
  } catch (err) {
    console.error(`Failed to clean localStorage for id ${id}:`, err);
  }
}

/**
 * Optimistically deletes a page client-side everywhere BEFORE performing any API calls:
 * 1. Closes open tab in Zustand tabsStore (persisted to localStorage) and determines next route path if active.
 * 2. Removes from Zustand `pageMeta` and `expandedNodeIds` maps (persisted to localStorage).
 * 3. Clears offline draft from localStorage.
 * 4. Removes from `['pageTree']` query cache recursively.
 * 5. Removes from `['childPages']`, `['pages', 'search']`, `['trashPages']` query caches.
 */
export function deleteClientPage(
  queryClient: QueryClient | undefined,
  pageId: string
): string | null {
  // 1. Immediately close open tab in Zustand tabsStore (updates persisted openTabs & activeTabId in localStorage)
  const nextPath = useUIStore.getState().closeTab(pageId);

  // 2. Clean up Zustand pageMeta, expandedNodeIds, and activePageId (persisted to localStorage)
  useUIStore.setState((state) => {
    let changed = false;
    let nextMeta = state.pageMeta;
    let nextExpanded = state.expandedNodeIds;
    let nextActive = state.activePageId;

    if (state.pageMeta[pageId]) {
      nextMeta = { ...state.pageMeta };
      delete nextMeta[pageId];
      changed = true;
    }
    if (state.expandedNodeIds[pageId] !== undefined) {
      nextExpanded = { ...state.expandedNodeIds };
      delete nextExpanded[pageId];
      changed = true;
    }
    if (state.activePageId === pageId) {
      nextActive = null;
      changed = true;
    }

    return changed
      ? { pageMeta: nextMeta, expandedNodeIds: nextExpanded, activePageId: nextActive }
      : state;
  });

  // 3. Clear offline drafts and cached data from localStorage
  cleanPersistedStorageForId(pageId);

  // 4. Optimistically remove node from TanStack Query caches
  if (queryClient) {
    const filterTreeNodes = (nodes: PageTreeNode[]): PageTreeNode[] => {
      let hasChanges = false;
      const filtered: PageTreeNode[] = [];
      for (const node of nodes) {
        if (node.id === pageId) {
          hasChanges = true;
          continue;
        }
        if (node.children && node.children.length > 0) {
          const updatedChildren = filterTreeNodes(node.children);
          if (updatedChildren !== node.children) {
            hasChanges = true;
            filtered.push({ ...node, children: updatedChildren });
            continue;
          }
        }
        filtered.push(node);
      }
      return hasChanges ? filtered : nodes;
    };

    queryClient.setQueriesData<PageTreeNode[]>(
      { queryKey: ['pageTree'] },
      (old) => (old && Array.isArray(old) ? filterTreeNodes(old) : old)
    );

    queryClient.setQueriesData<Page[]>(
      { queryKey: ['childPages'] },
      (old) => (old && Array.isArray(old) ? old.filter((item) => item.id !== pageId) : old)
    );

    queryClient.setQueriesData<any[]>(
      { queryKey: ['pages', 'search'] },
      (old) => (old && Array.isArray(old) ? old.filter((item) => item.id !== pageId) : old)
    );

    queryClient.setQueriesData<any[]>(
      { queryKey: ['databasesList'] },
      (old) => (old && Array.isArray(old) ? old.filter((db) => db.id !== pageId && db.pageId !== pageId) : old)
    );

    queryClient.removeQueries({ queryKey: ['page', pageId] });
  }

  return nextPath;
}

/**
 * Optimistically deletes a database client-side:
 * 1. Closes open tabs for databaseId and backing pageId.
 * 2. Cleans up Zustand `pageMeta` and `expandedNodeIds`.
 * 3. Clears persisted offline drafts from localStorage.
 * 4. Removes from `['databasesList']` query cache and invalidates/removes database query.
 */
export function deleteClientDatabase(
  queryClient: QueryClient | undefined,
  databaseId: string,
  pageId?: string | null
): string | null {
  const { closeTab } = useUIStore.getState();

  let nextPath = closeTab(databaseId);
  if (pageId) {
    const nextPath2 = closeTab(pageId);
    if (!nextPath && nextPath2) nextPath = nextPath2;
  }

  useUIStore.setState((state) => {
    const nextMeta = { ...state.pageMeta };
    const nextExpanded = { ...state.expandedNodeIds };
    let changed = false;

    if (nextMeta[databaseId]) {
      delete nextMeta[databaseId];
      changed = true;
    }
    if (nextExpanded[databaseId] !== undefined) {
      delete nextExpanded[databaseId];
      changed = true;
    }

    if (pageId) {
      if (nextMeta[pageId]) {
        delete nextMeta[pageId];
        changed = true;
      }
      if (nextExpanded[pageId] !== undefined) {
        delete nextExpanded[pageId];
        changed = true;
      }
    }

    let nextActive = state.activePageId;
    if (state.activePageId === databaseId || (pageId && state.activePageId === pageId)) {
      nextActive = null;
      changed = true;
    }

    return changed
      ? { pageMeta: nextMeta, expandedNodeIds: nextExpanded, activePageId: nextActive }
      : state;
  });

  // Clear offline drafts and localStorage entries
  cleanPersistedStorageForId(databaseId);
  if (pageId) {
    cleanPersistedStorageForId(pageId);
  }

  if (queryClient) {
    queryClient.setQueriesData<any[]>(
      { queryKey: ['databasesList'] },
      (old) => (old && Array.isArray(old) ? old.filter((db) => db.id !== databaseId && db.pageId !== pageId) : old)
    );
    queryClient.removeQueries({ queryKey: ['database', databaseId] });
    if (pageId) {
      deleteClientPage(queryClient, pageId);
    }
  }

  return nextPath;
}

/**
 * Optimistically restores a page from trash:
 * 1. Immediately removes the page from `['trashPages']` query cache.
 * 2. Triggers refetch/invalidation of `['pageTree']`.
 */
export function restoreClientPage(
  queryClient: QueryClient | undefined,
  pageId: string
) {
  if (queryClient) {
    queryClient.setQueriesData<any[]>(
      { queryKey: ['trashPages'] },
      (old) => (old && Array.isArray(old) ? old.filter((p) => p.id !== pageId) : old)
    );
    queryClient.invalidateQueries({ queryKey: ['pageTree'] });
  }
}

/**
 * Optimistically permanently deletes a page from trash:
 * 1. Immediately removes from `['trashPages']` query cache.
 * 2. Closes open tab and cleans up `pageMeta` and `expandedNodeIds`.
 * 3. Clears offline drafts and localStorage keys.
 */
export function permanentlyDeleteClientPage(
  queryClient: QueryClient | undefined,
  pageId: string
) {
  useUIStore.getState().closeTab(pageId);
  useUIStore.setState((state) => {
    let changed = false;
    let nextMeta = state.pageMeta;
    let nextExpanded = state.expandedNodeIds;

    if (state.pageMeta[pageId]) {
      nextMeta = { ...state.pageMeta };
      delete nextMeta[pageId];
      changed = true;
    }
    if (state.expandedNodeIds[pageId] !== undefined) {
      nextExpanded = { ...state.expandedNodeIds };
      delete nextExpanded[pageId];
      changed = true;
    }

    return changed
      ? { pageMeta: nextMeta, expandedNodeIds: nextExpanded }
      : state;
  });

  cleanPersistedStorageForId(pageId);

  if (queryClient) {
    queryClient.setQueriesData<any[]>(
      { queryKey: ['trashPages'] },
      (old) => (old && Array.isArray(old) ? old.filter((p) => p.id !== pageId) : old)
    );
    queryClient.removeQueries({ queryKey: ['page', pageId] });
  }
}

/**
 * Optimistically empties all items from trash:
 * 1. Instantly sets `['trashPages']` query cache to empty array.
 * 2. Clears tabs, drafts, and localStorage items for all trash items.
 */
export function emptyClientTrash(queryClient: QueryClient | undefined) {
  if (queryClient) {
    const trashList = queryClient.getQueryData<any[]>(['trashPages']) || [];
    for (const item of trashList) {
      if (item?.id) {
        useUIStore.getState().closeTab(item.id);
        cleanPersistedStorageForId(item.id);
      }
    }

    queryClient.setQueriesData<any[]>(
      { queryKey: ['trashPages'] },
      () => []
    );
  }
}

/**
 * Optimistically toggles or updates the pinned / favorite status of a page or database:
 * 1. TanStack Query cache `['pageTree']` (instantly moves item to/from Favorites section in sidebar).
 * 2. TanStack Query cache `['page', pageId]`.
 * 3. TanStack Query cache `['database']` and `['databasesList']`.
 * 4. TanStack Query cache `['childPages']`.
 */
export function updateClientPagePin(
  queryClient: QueryClient | undefined,
  pageId: string,
  isPinned: boolean
) {
  if (!queryClient || !pageId) return;

  // 1. Optimistically update ['pageTree'] recursively
  const updateTreeNodes = (nodes: PageTreeNode[]): PageTreeNode[] => {
    let hasChanged = false;
    const updated = nodes.map((node) => {
      let newNode = node;
      if (node.id === pageId || (node.databaseId && node.databaseId === pageId)) {
        hasChanged = true;
        newNode = { ...node, isPinned };
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

  // 2. Optimistically update ['page', pageId]
  queryClient.setQueryData<Page>(
    ['page', pageId],
    (old) => (old ? { ...old, isPinned } : old)
  );

  // 3. Optimistically update ['database']
  queryClient.setQueriesData<any>(
    { queryKey: ['database'] },
    (old: any) => {
      if (!old || !old.database) return old;
      if (old.database.id === pageId || old.database.pageId === pageId) {
        return {
          ...old,
          database: {
            ...old.database,
            isPinned,
          },
        };
      }
      return old;
    }
  );

  // 4. Optimistically update ['databasesList']
  queryClient.setQueriesData<any[]>(
    { queryKey: ['databasesList'] },
    (old) => {
      if (!old || !Array.isArray(old)) return old;
      return old.map((dbItem) => {
        if (dbItem.id === pageId || dbItem.pageId === pageId) {
          return { ...dbItem, isPinned };
        }
        return dbItem;
      });
    }
  );

  // 5. Optimistically update ['childPages']
  queryClient.setQueriesData<Page[]>(
    { queryKey: ['childPages'] },
    (old) => {
      if (!old || !Array.isArray(old)) return old;
      return old.map((item) => (item.id === pageId ? { ...item, isPinned } : item));
    }
  );
}

/**
 * Optimistically updates the visibility (access level) of a page or database:
 * 1. TanStack Query cache `['pageTree']` (immediately updates padlock/globe icon in sidebar and home).
 * 2. TanStack Query cache `['page', pageId]`.
 * 3. TanStack Query cache `['database']` and `['databasesList']`.
 * 4. TanStack Query cache `['publicPage', pageId]`.
 */
export function updateClientPageVisibility(
  queryClient: QueryClient | undefined,
  pageId: string,
  visibility: 'private' | 'workspace' | 'public' | 'public_edit'
) {
  if (!queryClient || !pageId) return;

  // 1. Optimistically update ['pageTree'] recursively
  const updateTreeNodes = (nodes: PageTreeNode[]): PageTreeNode[] => {
    let hasChanged = false;
    const updated = nodes.map((node) => {
      let newNode = node;
      if (node.id === pageId || (node.databaseId && node.databaseId === pageId)) {
        hasChanged = true;
        newNode = { ...node, visibility };
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

  // 2. Optimistically update ['page', pageId]
  queryClient.setQueryData<Page>(
    ['page', pageId],
    (old) => (old ? { ...old, visibility } : old)
  );

  // 3. Optimistically update ['database']
  queryClient.setQueriesData<any>(
    { queryKey: ['database'] },
    (old: any) => {
      if (!old || !old.database) return old;
      if (old.database.id === pageId || old.database.pageId === pageId) {
        return {
          ...old,
          database: {
            ...old.database,
            visibility,
          },
        };
      }
      return old;
    }
  );

  // 4. Optimistically update ['databasesList']
  queryClient.setQueriesData<any[]>(
    { queryKey: ['databasesList'] },
    (old) => {
      if (!old || !Array.isArray(old)) return old;
      return old.map((dbItem) => {
        if (dbItem.id === pageId || dbItem.pageId === pageId) {
          return { ...dbItem, visibility };
        }
        return dbItem;
      });
    }
  );

  // 5. Optimistically update ['publicPage', pageId]
  queryClient.setQueryData(
    ['publicPage', pageId],
    (old: any) => {
      if (!old || !old.page) return old;
      return {
        ...old,
        page: { ...old.page, visibility },
      };
    }
  );
}

/**
 * Optimistically creates a pending child sub-page in the page tree.
 * Automatically expands the parent node in the sidebar.
 */
export function createClientSubPage(
  queryClient: QueryClient | undefined,
  {
    workspaceId,
    parentId,
    title = 'Untitled Document',
    icon = '📄',
  }: {
    workspaceId?: string;
    parentId?: string | null;
    title?: string;
    icon?: string | null;
  }
) {
  if (!queryClient) return { tempId: null, previousTree: undefined };

  const tempId = 'temp-create-' + Date.now();
  const newNode: PageTreeNode = {
    id: tempId,
    workspaceId: workspaceId || '',
    parentId: parentId || null,
    title,
    icon: icon || '📄',
    visibility: 'private',
    order: 999999,
    createdAt: new Date(),
    updatedAt: new Date(),
    children: [],
    canEdit: true,
    canDelete: true,
  };

  if (parentId) {
    useUIStore.getState().setNodeExpand(parentId, true);
  }

  const insertNode = (nodes: PageTreeNode[]): PageTreeNode[] => {
    if (!parentId) {
      return [...nodes, newNode];
    }
    return nodes.map((node) => {
      if (node.id === parentId) {
        return {
          ...node,
          children: [...(node.children || []), newNode],
        };
      }
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: insertNode(node.children),
        };
      }
      return node;
    });
  };

  const previousTree = queryClient.getQueryData<PageTreeNode[]>(['pageTree', workspaceId]) ||
    queryClient.getQueryData<PageTreeNode[]>(['pageTree']);

  queryClient.setQueriesData<PageTreeNode[]>(
    { queryKey: ['pageTree'] },
    (old) => (old && Array.isArray(old) ? insertNode(old) : [newNode])
  );

  return { tempId, previousTree };
}

/**
 * Optimistically duplicates a page or database in the page tree and databases list.
 */
export function duplicateClientPage(
  queryClient: QueryClient | undefined,
  pageId: string,
  workspaceId?: string
) {
  if (!queryClient || !pageId) return { tempId: null, previousTree: undefined, duplicatedNode: null };

  const tempId = 'temp-dup-' + Date.now();
  let duplicatedNode: PageTreeNode | null = null;

  const duplicateInTree = (nodes: PageTreeNode[]): PageTreeNode[] => {
    const result: PageTreeNode[] = [];
    for (const node of nodes) {
      result.push(node);
      if (node.id === pageId || node.databaseId === pageId) {
        duplicatedNode = {
          ...node,
          id: tempId,
          title: `${node.title || 'Untitled'} (Copy)`,
          createdAt: new Date(),
          updatedAt: new Date(),
          children: [],
        };
        result.push(duplicatedNode);
      } else if (node.children && node.children.length > 0) {
        node.children = duplicateInTree(node.children);
      }
    }
    return result;
  };

  const previousTree = queryClient.getQueryData<PageTreeNode[]>(['pageTree', workspaceId]) ||
    queryClient.getQueryData<PageTreeNode[]>(['pageTree']);

  queryClient.setQueriesData<PageTreeNode[]>(
    { queryKey: ['pageTree'] },
    (old) => (old && Array.isArray(old) ? duplicateInTree(old) : old)
  );

  return { tempId, previousTree, duplicatedNode };
}

/**
 * Optimistically reorders a page within the page tree.
 */
export function reorderClientPageTree(
  queryClient: QueryClient | undefined,
  {
    pageId,
    targetParentId,
    targetOrder,
    workspaceId,
  }: {
    pageId: string;
    targetParentId: string | null;
    targetOrder: number;
    workspaceId?: string;
  }
) {
  if (!queryClient || !pageId) return { previousTree: undefined };

  const previousTree = queryClient.getQueryData<PageTreeNode[]>(['pageTree', workspaceId]) ||
    queryClient.getQueryData<PageTreeNode[]>(['pageTree']);

  let movingNode: PageTreeNode | null = null;

  // 1. Remove node from previous position
  const removeNode = (nodes: PageTreeNode[]): PageTreeNode[] => {
    return nodes
      .filter((node) => {
        if (node.id === pageId) {
          movingNode = { ...node, parentId: targetParentId, order: targetOrder };
          return false;
        }
        return true;
      })
      .map((node) => {
        if (node.children && node.children.length > 0) {
          return { ...node, children: removeNode(node.children) };
        }
        return node;
      });
  };

  // 2. Insert node into target position
  const insertNode = (nodes: PageTreeNode[]): PageTreeNode[] => {
    if (!movingNode) return nodes;

    if (!targetParentId) {
      const next = [...nodes];
      const clampedIndex = Math.max(0, Math.min(targetOrder, next.length));
      next.splice(clampedIndex, 0, movingNode);
      return next;
    }

    return nodes.map((node) => {
      if (node.id === targetParentId) {
        const nextChildren = [...(node.children || [])];
        const clampedIndex = Math.max(0, Math.min(targetOrder, nextChildren.length));
        nextChildren.splice(clampedIndex, 0, movingNode!);
        return { ...node, children: nextChildren };
      }
      if (node.children && node.children.length > 0) {
        return { ...node, children: insertNode(node.children) };
      }
      return node;
    });
  };

  queryClient.setQueriesData<PageTreeNode[]>(
    { queryKey: ['pageTree'] },
    (old) => {
      if (!old || !Array.isArray(old)) return old;
      const stripped = removeNode(old);
      return insertNode(stripped);
    }
  );

  return { previousTree };
}


