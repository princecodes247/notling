import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface TabItem {
  id: string;
  title: string;
  icon?: string;
  path: string;
}

interface TabsState {
  openTabs: TabItem[];
  activeTabId: string | null;
  openTab: (tab: TabItem) => void;
  closeTab: (tabId: string) => string | null;
  updateTabMeta: (id: string, title: string, icon?: string) => void;
  setActiveTabId: (id: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  setOpenTabs: (tabs: TabItem[]) => void;
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      openTabs: [],
      activeTabId: 'home',

      openTab: (tab) =>
        set((state) => {
          if (tab.id === 'home') {
            if (state.activeTabId === 'home') return state;
            return { activeTabId: 'home' };
          }

          const existingIndex = state.openTabs.findIndex((t) => t.id === tab.id);
          if (existingIndex !== -1) {
            const existing = state.openTabs[existingIndex];
            const isSame =
              existing.title === tab.title &&
              existing.icon === tab.icon &&
              existing.path === tab.path &&
              state.activeTabId === tab.id;

            if (isSame) return state;

            const newTabs = [...state.openTabs];
            const mergedTitle =
              tab.title && tab.title !== 'Untitled Document'
                ? tab.title
                : (existing.title && existing.title !== 'Untitled Document' ? existing.title : tab.title);
            const mergedIcon = tab.icon || existing.icon;

            newTabs[existingIndex] = { ...existing, ...tab, title: mergedTitle, icon: mergedIcon };
            return {
              openTabs: newTabs,
              activeTabId: tab.id,
            };
          }

          return {
            openTabs: [...state.openTabs, tab],
            activeTabId: tab.id,
          };
        }),

      closeTab: (tabId) => {
        let nextPath: string | null = null;
        const state = get();
        const fileTabs = state.openTabs.filter((t) => t.id !== 'home');
        const index = fileTabs.findIndex(
          (t) => t.id === tabId || t.path.endsWith(`/${tabId}`)
        );
        if (index === -1) return null;

        const matchedTab = fileTabs[index];
        const actualTabId = matchedTab.id;
        const remainingTabs = fileTabs.filter((t) => t.id !== actualTabId);
        let nextActiveId = state.activeTabId;

        if (state.activeTabId === actualTabId || state.activeTabId === tabId) {
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

          const isTabMatching = (t: TabItem) =>
            t.id === id ||
            t.path.endsWith(`/p/${id}`) ||
            t.path.endsWith(`/db/${id}`) ||
            t.path.includes(`/p/${id}/`) ||
            t.path.includes(`/db/${id}/`);

          if ((state.activeTabId === id) && typeof document !== 'undefined') {
            document.title = `${resolvedTitle} — Notling`;
          }

          return {
            openTabs: state.openTabs.map((t) =>
              isTabMatching(t)
                ? { ...t, title: resolvedTitle, icon: icon !== undefined ? icon : t.icon }
                : t
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
    }),
    {
      name: 'notling_tabs_state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        openTabs: state.openTabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
);
