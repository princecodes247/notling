import { create } from 'zustand';

interface ModalState {
  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;

  isTrashOpen: boolean;
  setTrashOpen: (open: boolean) => void;
  toggleTrash: () => void;

  isImportOpen: boolean;
  setImportOpen: (open: boolean) => void;
  toggleImport: () => void;

  isShareModalOpen: boolean;
  setShareModalOpen: (open: boolean) => void;

  isExportModalOpen: boolean;
  setExportModalOpen: (open: boolean) => void;

  isHistoryDrawerOpen: boolean;
  setHistoryDrawerOpen: (open: boolean) => void;

  isRequestAccessOpen: boolean;
  setRequestAccessOpen: (open: boolean) => void;

  showHeaderMenu: boolean;
  setShowHeaderMenu: (open: boolean) => void;

  showEmojiPicker: boolean;
  setShowEmojiPicker: (open: boolean) => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isSearchOpen: false,
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),

  isTrashOpen: false,
  setTrashOpen: (open) => set({ isTrashOpen: open }),
  toggleTrash: () => set((state) => ({ isTrashOpen: !state.isTrashOpen })),

  isImportOpen: false,
  setImportOpen: (open) => set({ isImportOpen: open }),
  toggleImport: () => set((state) => ({ isImportOpen: !state.isImportOpen })),

  isShareModalOpen: false,
  setShareModalOpen: (open) => set({ isShareModalOpen: open }),

  isExportModalOpen: false,
  setExportModalOpen: (open) => set({ isExportModalOpen: open }),

  isHistoryDrawerOpen: false,
  setHistoryDrawerOpen: (open) => set({ isHistoryDrawerOpen: open }),

  isRequestAccessOpen: false,
  setRequestAccessOpen: (open) => set({ isRequestAccessOpen: open }),

  showHeaderMenu: false,
  setShowHeaderMenu: (open) => set({ showHeaderMenu: open }),

  showEmojiPicker: false,
  setShowEmojiPicker: (open) => set({ showEmojiPicker: open }),
}));
