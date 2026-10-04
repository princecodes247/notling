import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
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
    const localSignaling = `${protocol}//${window.location.host}/y-webrtc-signaling`;
    const envSignaling = import.meta.env.VITE_YJS_SIGNALING_URL;

    const signalingUrls = envSignaling
      ? [envSignaling, localSignaling]
      : [localSignaling];

    const provider = new WebrtcProvider(roomName, doc, {
      signaling: signalingUrls,
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

export interface DatabaseCollaborator {
  clientId: string;
  name: string;
  color: string;
  avatarUrl?: string | null;
  email?: string | null;
  role: 'viewer' | 'editor';
  activeCell?: { itemId: string; propId: string } | null;
  activeViewId?: string | null;
  lastPing?: Date;
}

export type DatabaseCollabAction =
  | { type: 'UPDATE_ITEM'; itemId: string; updates: { title?: string; properties?: Record<string, any>; order?: number } }
  | { type: 'ADD_ITEM'; item: any }
  | { type: 'DELETE_ITEM'; itemId: string }
  | { type: 'DELETE_ITEMS_BULK'; itemIds: string[] }
  | { type: 'REORDER_ITEMS'; fromIndex: number; toIndex: number }
  | { type: 'CREATE_PROPERTY'; property: any }
  | { type: 'UPDATE_PROPERTY'; propertyId: string; updates: any }
  | { type: 'DELETE_PROPERTY'; propertyId: string }
  | { type: 'CREATE_VIEW'; view: any }
  | { type: 'UPDATE_VIEW'; viewId: string; updates: any }
  | { type: 'DELETE_VIEW'; viewId: string }
  | { type: 'UPDATE_DATABASE_META'; updates: { title?: string; icon?: string | null } }
  | { type: 'IMPORT_DATA'; items?: any[]; properties?: any[] };

export interface DatabaseCollaborationConfig {
  doc: Y.Doc;
  provider: WebrtcProvider;
  collaborators: DatabaseCollaborator[];
  collaboratorFocus: Record<string, DatabaseCollaborator[]>;
  broadcastAction: (action: DatabaseCollabAction) => void;
  setActiveCell: (cell: { itemId: string; propId: string } | null) => void;
  setActiveView: (viewId: string) => void;
}

export function useDatabaseCollaboration({
  databaseId,
  userDisplayName,
  userIdentifier,
  userAvatarUrl,
  isViewer = false,
  onRemoteAction,
}: {
  databaseId: string;
  userDisplayName?: string | null;
  userIdentifier?: string | null;
  userAvatarUrl?: string | null;
  isViewer?: boolean;
  onRemoteAction?: (action: DatabaseCollabAction) => void;
}): DatabaseCollaborationConfig | null {
  const roomKey = `db-${databaseId}`;
  const collabData = useMemo(() => {
    if (typeof window === 'undefined' || !databaseId) return null;
    return getOrCreateCollab(roomKey);
  }, [roomKey, databaseId]);

  useEffect(() => {
    if (!databaseId) return;
    return () => {
      releaseCollab(roomKey);
    };
  }, [roomKey, databaseId]);

  const [collaborators, setCollaborators] = useState<DatabaseCollaborator[]>([]);
  const [collaboratorFocus, setCollaboratorFocus] = useState<Record<string, DatabaseCollaborator[]>>({});
  const onRemoteActionRef = useRef(onRemoteAction);
  onRemoteActionRef.current = onRemoteAction;

  // Set user awareness state
  useEffect(() => {
    if (!collabData) return;
    const clientId = getClientId();
    const name = userDisplayName || userIdentifier || (isViewer ? `Guest ${clientId.slice(-4)}` : `User ${clientId.slice(-4)}`);
    const color = getCursorColor(userIdentifier || userDisplayName || clientId);
    const userInfo = {
      name,
      color,
      avatarUrl: userAvatarUrl || null,
      email: userIdentifier || null,
      role: isViewer ? 'viewer' : 'editor',
      clientId,
    };
    collabData.provider.awareness.setLocalStateField('user', userInfo);
  }, [collabData, userDisplayName, userIdentifier, userAvatarUrl, isViewer]);

  // Awareness observer for live collaborator presence & cell focus
  useEffect(() => {
    if (!collabData?.provider?.awareness) return;
    const awareness = collabData.provider.awareness;
    const currentCid = getClientId();

    const updateFromAwareness = () => {
      const states = awareness.getStates();
      const nextCollabs: DatabaseCollaborator[] = [];
      const nextFocus: Record<string, DatabaseCollaborator[]> = {};

      states.forEach((state: any, clientYjsId: number) => {
        if (clientYjsId === awareness.clientID) return;
        if (!state || !state.user) return;
        const user = state.user;
        const cid = user.clientId || String(clientYjsId);
        if (cid === currentCid) return;

        const collab: DatabaseCollaborator = {
          clientId: cid,
          name: user.name || `User ${cid.slice(-4)}`,
          color: user.color || getCursorColor(cid),
          avatarUrl: user.avatarUrl || null,
          email: user.email || null,
          role: user.role || 'editor',
          activeCell: state.activeCell || null,
          activeViewId: state.activeViewId || null,
          lastPing: new Date(),
        };
        nextCollabs.push(collab);

        if (state.activeCell && state.activeCell.itemId) {
          const cellKey = `${state.activeCell.itemId}:${state.activeCell.propId || '__TITLE__'}`;
          if (!nextFocus[cellKey]) nextFocus[cellKey] = [];
          nextFocus[cellKey].push(collab);

          const rowKey = state.activeCell.itemId;
          if (!nextFocus[rowKey]) nextFocus[rowKey] = [];
          nextFocus[rowKey].push(collab);
        }
      });

      setCollaborators((prev) => {
        if (
          prev.length === nextCollabs.length &&
          prev.every((p, i) => {
            const n = nextCollabs[i];
            return (
              p.clientId === n.clientId &&
              p.name === n.name &&
              p.color === n.color &&
              p.avatarUrl === n.avatarUrl &&
              p.activeViewId === n.activeViewId &&
              p.activeCell?.itemId === n.activeCell?.itemId &&
              p.activeCell?.propId === n.activeCell?.propId
            );
          })
        ) {
          return prev;
        }
        return nextCollabs;
      });

      setCollaboratorFocus((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(nextFocus);
        if (
          prevKeys.length === nextKeys.length &&
          prevKeys.every((k) => {
            const pList = prev[k];
            const nList = nextFocus[k];
            if (!pList || !nList || pList.length !== nList.length) return false;
            return pList.every((collab, i) => collab.clientId === nList[i].clientId);
          })
        ) {
          return prev;
        }
        return nextFocus;
      });
    };

    awareness.on('change', updateFromAwareness);
    updateFromAwareness();

    return () => {
      awareness.off('change', updateFromAwareness);
    };
  }, [collabData]);

  // Actions Map
  const actionsMap = useMemo(() => {
    if (!collabData?.doc) return null;
    return collabData.doc.getMap('db-actions');
  }, [collabData?.doc]);

  const processedActionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!actionsMap) return;
    const currentCid = getClientId();

    const handleObserve = (event: Y.YMapEvent<any>) => {
      event.changes.keys.forEach((change, key) => {
        if (change.action === 'add' || change.action === 'update') {
          const action = actionsMap.get(key) as any;
          if (!action || !action._clientId || action._clientId === currentCid) return;
          if (action._timestamp && Date.now() - action._timestamp > 20000) return;
          if (processedActionsRef.current.has(action._actionId)) return;
          processedActionsRef.current.add(action._actionId);
          onRemoteActionRef.current?.(action);
        }
      });
    };

    actionsMap.observe(handleObserve);
    return () => {
      actionsMap.unobserve(handleObserve);
    };
  }, [actionsMap]);

  const broadcastAction = useCallback(
    (action: DatabaseCollabAction) => {
      if (!actionsMap || isViewer) return;
      const currentCid = getClientId();
      const actionId = `${Date.now()}_${currentCid}_${Math.random().toString(36).substring(2, 8)}`;
      const payload = {
        ...action,
        _actionId: actionId,
        _clientId: currentCid,
        _timestamp: Date.now(),
      };
      processedActionsRef.current.add(actionId);
      actionsMap.set(actionId, payload);

      if (actionsMap.size > 40) {
        const cutoff = Date.now() - 30000;
        for (const [k, v] of actionsMap.entries()) {
          if (v && typeof v === 'object' && (v as any)._timestamp < cutoff) {
            actionsMap.delete(k);
          }
        }
      }
    },
    [actionsMap, isViewer]
  );

  const lastActiveCellRef = useRef<{ itemId: string; propId: string } | null>(null);
  const setActiveCell = useCallback(
    (cell: { itemId: string; propId: string } | null) => {
      if (!collabData?.provider?.awareness) return;
      const prev = lastActiveCellRef.current;
      const isSame =
        (!prev && !cell) ||
        (prev && cell && prev.itemId === cell.itemId && prev.propId === cell.propId);
      if (isSame) return;
      lastActiveCellRef.current = cell;
      collabData.provider.awareness.setLocalStateField('activeCell', cell);
    },
    [collabData?.provider?.awareness]
  );

  const lastActiveViewRef = useRef<string | null>(null);
  const setActiveView = useCallback(
    (viewId: string) => {
      if (!collabData?.provider?.awareness) return;
      if (lastActiveViewRef.current === viewId) return;
      lastActiveViewRef.current = viewId;
      collabData.provider.awareness.setLocalStateField('activeViewId', viewId);
    },
    [collabData?.provider?.awareness]
  );

  if (!collabData) return null;

  return {
    doc: collabData.doc,
    provider: collabData.provider,
    collaborators,
    collaboratorFocus,
    broadcastAction,
    setActiveCell,
    setActiveView,
  };
}

