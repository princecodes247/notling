import { create } from 'zustand';

export interface TabItem {
  id: string;
  title: string;
  icon?: string;
  path: string;
}

export interface LivePageMeta {
  title: string;
  icon: string;
}

interface UIState {
  // Live client-side page meta overrides (pageId -> { title, icon })
  pageMeta: Record<string, LivePageMeta>;
  setPageMeta: (pageId: string, meta: { title?: string; icon?: string | null }) => void;

  // Tree expanded nodes state
  expandedNodeIds: Record<string, boolean>;
  toggleNodeExpand: (nodeId: string) => void;
  setNodeExpand: (nodeId: string, expanded: boolean) => void;

  // Active Page ID
  activePageId: string | null;
  setActivePageId: (pageId: string | null) => void;

  // Tabs State
  openTabs: TabItem[];
  activeTabId: string | null;
  openTab: (tab: TabItem) => void;
  closeTab: (tabId: string) => string | null;
  updateTabMeta: (id: string, title: string, icon?: string) => void;
  setActiveTabId: (id: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  setOpenTabs: (tabs: TabItem[]) => void;

  // Modals & Panels
  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;

  isTrashOpen: boolean;
  setTrashOpen: (open: boolean) => void;
  toggleTrash: () => void;

  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Save Indicator State
  saveStatus: 'idle' | 'saving' | 'saved' | 'offline' | 'error';
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'offline' | 'error') => void;

  // Connection State
  isOnline: boolean;
  isServerReachable: boolean;
  setConnectionStatus: (isOnline: boolean, isServerReachable: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  pageMeta: {},
  setPageMeta: (pageId, meta) =>
    set((state) => {
      const prevMeta = state.pageMeta[pageId];
      const nextTitle =
        meta.title !== undefined
          ? meta.title || 'Untitled Document'
          : prevMeta?.title || 'Untitled Document';
      const nextIcon =
        meta.icon !== undefined
          ? (meta.icon || '📄')
          : prevMeta?.icon || '📄';

      const updatedPageMeta = {
        ...state.pageMeta,
        [pageId]: {
          title: nextTitle,
          icon: nextIcon,
        },
      };

      const updatedTabs = state.openTabs.map((t) =>
        t.id === pageId
          ? {
              ...t,
              title: nextTitle,
              icon: nextIcon,
            }
          : t
      );

      // Instantly update browser document title if this page is active
      if (
        (state.activeTabId === pageId || state.activePageId === pageId) &&
        typeof document !== 'undefined'
      ) {
        document.title = `${nextTitle} — Notling`;
      }

      return {
        pageMeta: updatedPageMeta,
        openTabs: updatedTabs,
      };
    }),

  expandedNodeIds: {},
  toggleNodeExpand: (nodeId) =>
    set((state) => ({
      expandedNodeIds: {
        ...state.expandedNodeIds,
        [nodeId]: !state.expandedNodeIds[nodeId],
      },
    })),
  setNodeExpand: (nodeId, expanded) =>
    set((state) => ({
      expandedNodeIds: {
        ...state.expandedNodeIds,
        [nodeId]: expanded,
      },
    })),

  activePageId: null,
  setActivePageId: (pageId) =>
    set((state) => (state.activePageId === pageId ? state : { activePageId: pageId })),

  openTabs: [],
  activeTabId: 'home',
  openTab: (tab) =>
    set((state) => {
      if (tab.id === 'home') {
        if (state.activeTabId === 'home') return state;
        return { activeTabId: 'home' };
      }

      const live = state.pageMeta[tab.id];
      const resolvedTabTitle = live?.title ?? tab.title;
      const resolvedTabIcon = live?.icon ?? tab.icon;

      const existingIndex = state.openTabs.findIndex((t) => t.id === tab.id);
      if (existingIndex !== -1) {
        const existing = state.openTabs[existingIndex];
        const isSame =
          existing.title === resolvedTabTitle &&
          existing.icon === resolvedTabIcon &&
          existing.path === tab.path &&
          state.activeTabId === tab.id;

        if (isSame) {
          return state;
        }

        const newTabs = [...state.openTabs];
        const mergedTitle =
          resolvedTabTitle && resolvedTabTitle !== 'Untitled Document'
            ? resolvedTabTitle
            : (existing.title && existing.title !== 'Untitled Document' ? existing.title : resolvedTabTitle);
        const mergedIcon = resolvedTabIcon || existing.icon;

        newTabs[existingIndex] = { ...existing, ...tab, title: mergedTitle, icon: mergedIcon };
        return {
          openTabs: newTabs,
          activeTabId: tab.id,
        };
      }
      return {
        openTabs: [...state.openTabs, { ...tab, title: resolvedTabTitle, icon: resolvedTabIcon }],
        activeTabId: tab.id,
      };
    }),
  closeTab: (tabId) => {
    let nextPath: string | null = null;
    const state = get();
    const fileTabs = state.openTabs.filter((t) => t.id !== 'home');
    const index = fileTabs.findIndex((t) => t.id === tabId);
    if (index === -1) return null;

    const remainingTabs = fileTabs.filter((t) => t.id !== tabId);
    let nextActiveId = state.activeTabId;

    if (state.activeTabId === tabId) {
      if (remainingTabs.length > 0) {
        const nextIndex = Math.max(0, index - 1);
        nextActiveId = remainingTabs[nextIndex].id;
        nextPath = remainingTabs[nextIndex].path;
      } else {
        nextActiveId = 'home';
        nextPath = '/dashboard';
      }
    }

    set({
      openTabs: remainingTabs,
      activeTabId: nextActiveId,
    });

    return nextPath;
  },
  updateTabMeta: (id, title, icon) =>
    set((state) => {
      const resolvedTitle = title || 'Untitled Document';
      const resolvedIcon = icon !== undefined ? icon : (state.pageMeta[id]?.icon || '📄');

      const updatedPageMeta = {
        ...state.pageMeta,
        [id]: {
          title: resolvedTitle,
          icon: resolvedIcon,
        },
      };

      if (
        (state.activeTabId === id || state.activePageId === id) &&
        typeof document !== 'undefined'
      ) {
        document.title = `${resolvedTitle} — Notling`;
      }

      return {
        pageMeta: updatedPageMeta,
        openTabs: state.openTabs.map((t) =>
          t.id === id ? { ...t, title: resolvedTitle, icon: resolvedIcon } : t
        ),
      };
    }),
  setActiveTabId: (id) => set({ activeTabId: id }),
  reorderTabs: (fromIndex, toIndex) =>
    set((state) => {
      if (
        fromIndex < 0 ||
        fromIndex >= state.openTabs.length ||
        toIndex < 0 ||
        toIndex >= state.openTabs.length ||
        fromIndex === toIndex
      ) {
        return state;
      }
      const updated = [...state.openTabs];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return { openTabs: updated };
    }),
  setOpenTabs: (tabs) => set({ openTabs: tabs }),

  isSearchOpen: false,
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),

  isTrashOpen: false,
  setTrashOpen: (open) => set({ isTrashOpen: open }),
  toggleTrash: () => set((state) => ({ isTrashOpen: !state.isTrashOpen })),

  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  saveStatus: 'saved',
  setSaveStatus: (status) => set({ saveStatus: status }),

  isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
  isServerReachable: true,
  setConnectionStatus: (isOnline, isServerReachable) =>
    set({ isOnline, isServerReachable }),
}));
