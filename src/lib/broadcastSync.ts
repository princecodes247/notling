/**
 * Cross-tab synchronization via BroadcastChannel.
 * Whenever a page or database is updated or saved in one tab,
 * notify other tabs in the same browser to invalidate their query cache.
 */

export type TabSyncMessage =
  | { type: 'PAGE_UPDATED'; pageId: string; updatedAt?: string | number }
  | { type: 'PAGE_META_UPDATED'; pageId: string; title?: string; icon?: string | null }
  | { type: 'DATABASE_UPDATED'; databaseId: string };

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null;
  if (!channel) {
    try {
      channel = new BroadcastChannel('notling_tab_sync');
    } catch (err) {
      console.warn('BroadcastChannel not supported or initialization failed:', err);
      channel = null;
    }
  }
  return channel;
}

export function broadcastPageUpdate(pageId: string, updatedAt?: string | number): void {
  const ch = getChannel();
  if (ch) {
    ch.postMessage({ type: 'PAGE_UPDATED', pageId, updatedAt });
  }
}

export function broadcastPageMetaUpdate(
  pageId: string,
  title?: string,
  icon?: string | null
): void {
  const ch = getChannel();
  if (ch) {
    ch.postMessage({ type: 'PAGE_META_UPDATED', pageId, title, icon });
  }
}

export function broadcastDatabaseUpdate(databaseId: string): void {
  const ch = getChannel();
  if (ch) {
    ch.postMessage({ type: 'DATABASE_UPDATED', databaseId });
  }
}

export function subscribeToTabSync(onMessage: (msg: TabSyncMessage) => void): () => void {
  const ch = getChannel();
  if (!ch) return () => {};
  const handler = (event: MessageEvent<TabSyncMessage>) => {
    if (event.data && typeof event.data === 'object' && 'type' in event.data) {
      onMessage(event.data);
    }
  };
  ch.addEventListener('message', handler);
  return () => {
    ch.removeEventListener('message', handler);
  };
}
