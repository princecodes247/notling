import { useMemo, useEffect } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

const CURSOR_COLORS = [
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#6366f1', // Indigo
];

export function getClientId(): string {
  if (typeof window === 'undefined') return 'server';
  let cid = sessionStorage.getItem('notling_client_id');
  if (!cid) {
    cid = Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem('notling_client_id', cid);
  }
  return cid;
}

export function getCursorColor(identifier: string): string {
  if (!identifier) return CURSOR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CURSOR_COLORS.length;
  return CURSOR_COLORS[index];
}

export interface CollaborationConfig {
  doc: Y.Doc;
  provider: WebrtcProvider;
  fragment: Y.XmlFragment;
  user: {
    name: string;
    color: string;
  };
  showCursorLabels: 'always' | 'activity';
}

interface CachedCollab {
  doc: Y.Doc;
  provider: WebrtcProvider;
  fragment: Y.XmlFragment;
  refCount: number;
}

const collabCache = new Map<string, CachedCollab>();

function getOrCreateCollab(pageId: string): CachedCollab {
  let cached = collabCache.get(pageId);
  if (!cached || (cached.doc as any).isDestroyed || (cached.provider as any).destroyed) {
    const doc = new Y.Doc();
    const roomName = `notling-room-${pageId}`;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const signalingUrl = `${protocol}//${window.location.host}/y-webrtc-signaling`;

    const provider = new WebrtcProvider(roomName, doc, {
      signaling: [signalingUrl],
    });

    const fragment = doc.getXmlFragment('document-store');
    cached = { doc, provider, fragment, refCount: 0 };
    collabCache.set(pageId, cached);
  }
  cached.refCount++;
  return cached;
}

function releaseCollab(pageId: string) {
  const cached = collabCache.get(pageId);
  if (!cached) return;
  cached.refCount--;
  if (cached.refCount <= 0) {
    try {
      cached.provider.awareness.setLocalState(null);
      cached.provider.destroy();
      cached.doc.destroy();
    } catch {}
    collabCache.delete(pageId);
  }
}

export function useCollaboration(
  pageId: string,
  userDisplayName?: string | null,
  userIdentifier?: string | null,
  isViewer: boolean = false
): CollaborationConfig | null {
  const collabData = useMemo(() => {
    if (typeof window === 'undefined' || !pageId) return null;
    return getOrCreateCollab(pageId);
  }, [pageId]);

  // Clean up on unmount or pageId change
  useEffect(() => {
    if (!pageId) return;
    return () => {
      releaseCollab(pageId);
    };
  }, [pageId]);

  // Update user info in awareness without destroying provider or doc
  useEffect(() => {
    if (!collabData) return;
    const clientId = getClientId();
    const name = userDisplayName || userIdentifier || (isViewer ? `Guest ${clientId.slice(-4)}` : `User ${clientId.slice(-4)}`);
    const color = getCursorColor(userIdentifier || userDisplayName || clientId);
    const userInfo = { name, color, isViewer };
    collabData.provider.awareness.setLocalStateField('user', userInfo);

    if (isViewer) {
      collabData.provider.awareness.setLocalStateField('cursor', null);

      const preventCursorBroadcast = () => {
        const localState = collabData.provider.awareness.getLocalState();
        if (localState && localState.cursor !== null && localState.cursor !== undefined) {
          collabData.provider.awareness.setLocalStateField('cursor', null);
        }
      };

      collabData.provider.awareness.on('change', preventCursorBroadcast);
      collabData.provider.awareness.on('update', preventCursorBroadcast);

      return () => {
        collabData.provider.awareness.off('change', preventCursorBroadcast);
        collabData.provider.awareness.off('update', preventCursorBroadcast);
      };
    }
  }, [collabData, userDisplayName, userIdentifier, isViewer]);

  if (!collabData) return null;

  const clientId = getClientId();
  const name = userDisplayName || userIdentifier || (isViewer ? `Guest ${clientId.slice(-4)}` : `User ${clientId.slice(-4)}`);
  const color = getCursorColor(userIdentifier || userDisplayName || clientId);

  return {
    doc: collabData.doc,
    provider: collabData.provider,
    fragment: collabData.fragment,
    user: { name, color },
    showCursorLabels: 'always',
  };
}
