import { create } from 'zustand';

interface UIState {
  // Tree expanded nodes state
  expandedNodeIds: Record<string, boolean>;
  toggleNodeExpand: (nodeId: string) => void;
  setNodeExpand: (nodeId: string, expanded: boolean) => void;

  // Active Page ID
  activePageId: string | null;
  setActivePageId: (pageId: string | null) => void;

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
  saveStatus: 'idle' | 'saving' | 'saved';
  setSaveStatus: (status: 'idle' | 'saving' | 'saved') => void;
}

export const useUIStore = create<UIState>((set) => ({
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
  setActivePageId: (pageId) => set({ activePageId: pageId }),

  isSearchOpen: false,
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),

  isTrashOpen: false,
  setTrashOpen: (open) => set({ isTrashOpen: open }),
  toggleTrash: () => set((state) => ({ isTrashOpen: !state.isTrashOpen })),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  saveStatus: 'saved',
  setSaveStatus: (status) => set({ saveStatus: status }),
}));
