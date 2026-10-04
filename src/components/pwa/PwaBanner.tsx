import { useState } from 'react';
import { usePwa } from '~/context/PwaContext';
import { Download, RefreshCw, X, Smartphone } from 'lucide-react';

export function PwaBanner() {
  const {
    isInstallable,
    isInstalled,
    isUpdateAvailable,
    showInstallBanner,
    isIos,
    installApp,
    updateApp,
    dismissInstallBanner,
  } = usePwa();

  const [isInstalling, setIsInstalling] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  const handleInstall = async () => {
    if (isIos) {
      setShowIosModal(true);
      return;
    }
    setIsInstalling(true);
    await installApp();
    setIsInstalling(false);
  };

  return (
    <>
      {/* 1. App Update Toast */}
      {isUpdateAvailable && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-stone-900/95 dark:bg-white/95 text-white dark:text-stone-950 shadow-xl backdrop-blur-md border border-white/10 dark:border-black/10 text-xs font-medium">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Update available with latest features</span>
            <button
              type="button"
              onClick={updateApp}
              className="px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Update Now</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Floating Install Banner */}
      {showInstallBanner && !isInstalled && isInstallable && (
        <div className="fixed bottom-5 right-5 z-40 max-w-sm w-[calc(100vw-2.5rem)] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="relative p-4 rounded-2xl bg-white/95 dark:bg-zinc-900/95 border border-stone-200/90 dark:border-zinc-800/90 shadow-2xl backdrop-blur-md flex flex-col gap-3">
            {/* Dismiss button */}
            <button
              type="button"
              onClick={dismissInstallBanner}
              aria-label="Dismiss install banner"
              className="absolute top-3 right-3 text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200 p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-900 dark:bg-zinc-800 flex items-center justify-center text-white shrink-0 shadow-sm border border-stone-800 dark:border-zinc-700">
                <img src="/icons/icon-192.png" alt="Notling" className="w-8 h-8 rounded-lg" />
              </div>
              <div className="min-w-0 pr-4">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-semibold text-stone-900 dark:text-zinc-100">
                    Install Notling App
                  </h3>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    PWA
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-zinc-400 leading-snug mt-0.5">
                  Fast native experience with offline support and standalone window.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-stone-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={handleInstall}
                disabled={isInstalling}
                className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.98]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isInstalling ? 'Installing...' : 'Install App'}</span>
              </button>
              <button
                type="button"
                onClick={dismissInstallBanner}
                className="py-1.5 px-3 rounded-lg text-xs font-medium text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. iOS Installation Helper Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-zinc-800 p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs font-bold text-stone-900 dark:text-zinc-100">
                  Install on iOS Safari
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-500 dark:text-zinc-400 leading-relaxed">
              To install Notling on your iPhone or iPad:
            </p>

            <ol className="text-xs text-stone-700 dark:text-zinc-300 space-y-2.5 list-decimal pl-4">
              <li>
                Tap the <strong className="text-stone-900 dark:text-white">Share button</strong> (square with arrow up) at the bottom of Safari.
              </li>
              <li>
                Scroll down and tap <strong className="text-stone-900 dark:text-white">Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong className="text-stone-900 dark:text-white">Add</strong> in the top right corner.
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="w-full py-2 rounded-lg bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-semibold"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
