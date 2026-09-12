import { useState, useEffect } from 'react';
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

export function useCollaboration(
  pageId: string,
  userDisplayName?: string | null,
  userIdentifier?: string | null
): CollaborationConfig | null {
  const [collab, setCollab] = useState<CollaborationConfig | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !pageId) return;

    const doc = new Y.Doc();
    const roomName = `notling-room-${pageId}`;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const signalingUrl = `${protocol}//${window.location.host}/y-webrtc-signaling`;

    const provider = new WebrtcProvider(roomName, doc, {
      signaling: [signalingUrl],
    });

    const fragment = doc.getXmlFragment('document-store');

    const clientId = getClientId();
    const name = userDisplayName || userIdentifier || `User ${clientId.slice(-4)}`;
    const color = getCursorColor(userIdentifier || userDisplayName || clientId);

    const userInfo = { name, color };

    // Update awareness user state
    provider.awareness.setLocalStateField('user', userInfo);

    setCollab({
      doc,
      provider,
      fragment,
      user: userInfo,
      showCursorLabels: 'always',
    });

    return () => {
      try {
        provider.destroy();
        doc.destroy();
      } catch (err) {
        console.error('Error destroying Yjs WebRTC provider:', err);
      }
      setCollab(null);
    };
  }, [pageId, userDisplayName, userIdentifier]);

  return collab;
}
