import { create } from 'zustand';

interface StatusState {
  saveStatus: 'idle' | 'saving' | 'saved' | 'offline' | 'error';
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'offline' | 'error') => void;

  isOnline: boolean;
  isServerReachable: boolean;
  setConnectionStatus: (isOnline: boolean, isServerReachable: boolean) => void;

  canUndo: boolean;
  canRedo: boolean;
  setHistoryState: (canUndo: boolean, canRedo: boolean) => void;
}

export const useStatusStore = create<StatusState>((set) => ({
  saveStatus: 'saved',
  setSaveStatus: (status) => set({ saveStatus: status }),

  isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
  isServerReachable: true,
  setConnectionStatus: (isOnline, isServerReachable) =>
    set({ isOnline, isServerReachable }),

  canUndo: false,
  canRedo: false,
  setHistoryState: (canUndo, canRedo) => set({ canUndo, canRedo }),
}));
