import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface LivePageMeta {
  title: string;
  icon: string;
}

interface NavigationState {
  pageMeta: Record<string, LivePageMeta>;
  setPageMeta: (pageId: string, meta: { title?: string; icon?: string | null }) => void;

  expandedNodeIds: Record<string, boolean>;
  toggleNodeExpand: (nodeId: string) => void;
  setNodeExpand: (nodeId: string, expanded: boolean) => void;

  activePageId: string | null;
  setActivePageId: (pageId: string | null) => void;

  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
}

function syncSidebarCookie(open: boolean) {
  if (typeof document !== 'undefined') {
    document.cookie = `notling_sidebar_open=${open ? '1' : '0'}; path=/; max-age=31536000; SameSite=Lax`;
  }
}

function getInitialSidebarOpen(): boolean {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)notling_sidebar_open=([01])/);
    if (match) {
      return match[1] === '1';
    }
    try {
      const raw = localStorage.getItem('notling_navigation_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.state?.sidebarOpen === 'boolean') {
          syncSidebarCookie(parsed.state.sidebarOpen);
          return parsed.state.sidebarOpen;
        }
      }
    } catch {
      // fallback
    }
  }
  return true;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
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
              ? (meta.icon || '')
              : prevMeta?.icon || '';

          return {
            pageMeta: {
              ...state.pageMeta,
              [pageId]: {
                title: nextTitle,
                icon: nextIcon,
              },
            },
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

      sidebarOpen: getInitialSidebarOpen(),
      setSidebarOpen: (open) => {
        syncSidebarCookie(open);
        set({ sidebarOpen: open });
      },
      toggleSidebar: () =>
        set((state) => {
          const next = !state.sidebarOpen;
          syncSidebarCookie(next);
          return { sidebarOpen: next };
        }),

      mobileSidebarOpen: false,
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
      toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
    }),
    {
      name: 'notling_navigation_state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        expandedNodeIds: state.expandedNodeIds,
        sidebarOpen: state.sidebarOpen,
        pageMeta: state.pageMeta,
      }),
      merge: (persistedState: any, currentState) => {
        const nextSidebar = persistedState?.sidebarOpen ?? true;
        syncSidebarCookie(nextSidebar);
        return {
          ...currentState,
          ...persistedState,
          sidebarOpen: nextSidebar,
        };
      },
    }
  )
);
