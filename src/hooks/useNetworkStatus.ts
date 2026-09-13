import { useState, useEffect, useCallback } from 'react';
import { useUIStore } from '~/store/uiStore';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== 'undefined' ? navigator.onLine : true
  );
  const [isServerReachable, setIsServerReachable] = useState<boolean>(true);

  const checkServerPing = useCallback(async () => {
    if (typeof window === 'undefined') return true;
    if (!navigator.onLine) {
      setIsServerReachable(false);
      useUIStore.getState().setConnectionStatus(false, false);
      return false;
    }

    try {
      // Light ping to server origin with no-cache
      const res = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      }).catch(() => null);

      const reachable = res ? res.ok || res.status < 500 : true;
      setIsServerReachable(reachable);
      useUIStore.getState().setConnectionStatus(navigator.onLine, reachable);
      return reachable;
    } catch {
      setIsServerReachable(false);
      useUIStore.getState().setConnectionStatus(navigator.onLine, false);
      return false;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      checkServerPing();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsServerReachable(false);
      useUIStore.getState().setConnectionStatus(false, false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    checkServerPing();

    // Periodic heartbeat check every 15 seconds
    const interval = setInterval(checkServerPing, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkServerPing]);

  const isConnected = isOnline && isServerReachable;

  return {
    isOnline,
    isServerReachable,
    isConnected,
    checkConnection: checkServerPing,
  };
}
