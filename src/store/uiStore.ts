import { useTabsStore, type TabItem } from './tabsStore';
import { useNavigationStore, type LivePageMeta } from './navigationStore';
import { useModalStore } from './modalStore';
import { useStatusStore } from './statusStore';

export type { TabItem, LivePageMeta };
export { useTabsStore, useNavigationStore, useModalStore, useStatusStore };

type CombinedUIState = ReturnType<typeof useTabsStore.getState> &
  ReturnType<typeof useNavigationStore.getState> &
  ReturnType<typeof useModalStore.getState> &
  ReturnType<typeof useStatusStore.getState>;

/**
 * Backward-compatible unified UI Store hook that seamlessly delegates
 * to specialized smaller stores (tabs, navigation, modals, status).
 */
export function useUIStore(): CombinedUIState;
export function useUIStore<T>(selector: (state: CombinedUIState) => T): T;
export function useUIStore<T>(selector?: (state: CombinedUIState) => T): T | CombinedUIState {
  const tabs = useTabsStore();
  const nav = useNavigationStore();
  const modal = useModalStore();
  const status = useStatusStore();

  const combined: CombinedUIState = {
    ...tabs,
    ...nav,
    ...modal,
    ...status,
    // Cross-store synchronized helpers
    setPageMeta: (pageId: string, meta: { title?: string; icon?: string | null }) => {
      nav.setPageMeta(pageId, meta);
      if (meta.title !== undefined || meta.icon !== undefined) {
        tabs.updateTabMeta(pageId, meta.title || '', meta.icon ?? undefined);
      }
    },
    updateTabMeta: (id: string, title: string, icon?: string) => {
      tabs.updateTabMeta(id, title, icon);
      nav.setPageMeta(id, { title, icon });
    },
  };

  return selector ? selector(combined) : combined;
}

useUIStore.getState = (): CombinedUIState => {
  const tabs = useTabsStore.getState();
  const nav = useNavigationStore.getState();
  const modal = useModalStore.getState();
  const status = useStatusStore.getState();

  return {
    ...tabs,
    ...nav,
    ...modal,
    ...status,
    setPageMeta: (pageId: string, meta: { title?: string; icon?: string | null }) => {
      nav.setPageMeta(pageId, meta);
      if (meta.title !== undefined || meta.icon !== undefined) {
        tabs.updateTabMeta(pageId, meta.title || '', meta.icon ?? undefined);
      }
    },
    updateTabMeta: (id: string, title: string, icon?: string) => {
      tabs.updateTabMeta(id, title, icon);
      nav.setPageMeta(id, { title, icon });
    },
  };
};

useUIStore.setState = (
  updater:
    | Partial<CombinedUIState>
    | ((state: CombinedUIState) => Partial<CombinedUIState>)
): void => {
  const currentState = useUIStore.getState();
  const nextStatePartial = typeof updater === 'function' ? updater(currentState) : updater;

  if (!nextStatePartial) return;

  useTabsStore.setState(nextStatePartial);
  useNavigationStore.setState(nextStatePartial);
  useModalStore.setState(nextStatePartial);
  useStatusStore.setState(nextStatePartial);
};

useUIStore.subscribe = (
  listener: (state: CombinedUIState, prevState: CombinedUIState) => void
): (() => void) => {
  let currentState = useUIStore.getState();
  const notify = () => {
    const nextState = useUIStore.getState();
    const prevState = currentState;
    currentState = nextState;
    listener(nextState, prevState);
  };

  const unsub1 = useTabsStore.subscribe(notify);
  const unsub2 = useNavigationStore.subscribe(notify);
  const unsub3 = useModalStore.subscribe(notify);
  const unsub4 = useStatusStore.subscribe(notify);

  return () => {
    unsub1();
    unsub2();
    unsub3();
    unsub4();
  };
};

