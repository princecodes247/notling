import React, { useState } from 'react';
import { useNetworkStatus } from '~/hooks/useNetworkStatus';
import { WifiOff, RefreshCw } from 'lucide-react';

export const NetworkStatusBanner: React.FC = () => {
  const { isConnected, checkConnection } = useNetworkStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (isConnected) return null;

  const handleRetry = async () => {
    setIsRefreshing(true);
    await checkConnection();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="sticky top-0 z-[99999999999] bg-amber-500/30 text-amber-950 backdrop-blur-md px-4 py-2 text-xs font-medium flex items-center justify-between shadow-sm transition-all duration-300 z-50 border-b border-amber-600/30">
      <div className="flex items-center gap-2 max-w-4xl mx-auto w-full justify-between">
        <div className="flex items-center gap-2">
          <WifiOff size={16} className="text-amber-900 shrink-0" />
          <span>
            <strong className="font-semibold">Connection Lost:</strong> You are offline. Changes are saved locally and will sync automatically when reconnected.
          </span>
        </div>
        <button
          type="button"
          onClick={handleRetry}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/10 hover:bg-amber-950/20 active:bg-amber-950/30 transition-colors text-amber-950 text-[11px] font-semibold shrink-0 cursor-pointer"
        >
          <RefreshCw
            size={13}
            className={isRefreshing ? 'animate-spin' : ''}
          />
          <span>{isRefreshing ? 'Checking...' : 'Retry Now'}</span>
        </button>
      </div>
    </div>
  );
};
