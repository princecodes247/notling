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

      sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'notling_navigation_state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        expandedNodeIds: state.expandedNodeIds,
        sidebarOpen: state.sidebarOpen,
        pageMeta: state.pageMeta,
      }),
    }
  )
);
