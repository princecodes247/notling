import { useState } from 'react';
import { NotlingLogoIcon } from '~/components/Icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { LockIcon, ArrowRight01Icon, Download01Icon, Edit02Icon } from '@hugeicons/core-free-icons';
import { CollaboratorAvatars } from '~/components/CollaboratorAvatars';
import { ExportModal } from '~/components/ExportModal';
import ThemeToggle from '~/components/ThemeToggle';

interface ShareHeaderProps {
  pageId: string;
  accessLevel: string;
  isLoggedIn: boolean;
  isWorkspaceMember: boolean;
  userEmail?: string | null;
  activeUsers?: any[];
  currentClientId: string;
  page?: any;
  isDatabase?: boolean;
  databaseData?: any;
  onNavigateHome: () => void;
  onOpenDashboard: () => void;
  onSignIn: () => void;
  onRequestEditAccess?: () => void;
}

export function ShareHeader({
  accessLevel,
  isLoggedIn,
  isWorkspaceMember,
  userEmail,
  activeUsers = [],
  currentClientId,
  page,
  isDatabase = false,
  databaseData,
  onNavigateHome,
  onOpenDashboard,
  onSignIn,
  onRequestEditAccess,
}: ShareHeaderProps) {
  const [isExportOpen, setIsExportOpen] = useState(false);

  return (
    <header className="h-14 border-b border-stone-200/70 dark:border-zinc-800 px-3 sm:px-6 md:px-10 flex items-center justify-between bg-[#fdfcf9]/95 dark:bg-[#18181b]/95 backdrop-blur-md sticky top-0 z-30 select-none">
      {/* Brand Logo & Name */}
      <div
        className="flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 hover:opacity-85 transition-opacity"
        onClick={onNavigateHome}
      >
        <NotlingLogoIcon className="w-5 h-5 text-brand-600 dark:text-brand-400 drop-shadow-2xs" />
        <span className="font-bold hidden sm:inline text-sm md:text-base tracking-tight text-neutral-900 dark:text-white">
          Notling
        </span>
      </div>

      {/* Actions & Status Header Area */}
      <div className="flex items-center gap-1 sm:gap-2.5 md:gap-3 shrink-0 min-w-0">
        {/* Active Collaborator Avatars (Shown on min-380px screens) */}
        <div className="hidden min-[380px]:flex items-center">
          <CollaboratorAvatars activeUsers={activeUsers} currentClientId={currentClientId} />
        </div>

        {/* Access Status Badge & Request Edit Access Button */}
        {accessLevel === 'editor' ? (
          <span className="text-[10px] sm:text-[11px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 flex items-center gap-1 sm:gap-1.5 shadow-2xs shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] animate-pulse" />
            <span className="hidden sm:inline">Can edit</span>
            <span className="sm:hidden">Edit</span>
          </span>
        ) : (
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <span className="text-[10px] sm:text-[11px] px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 flex items-center gap-1 sm:gap-1.5 shadow-2xs shrink-0">
              <HugeiconsIcon icon={LockIcon} size={11} />
              <span className="hidden sm:inline">View only</span>
            </span>
            {onRequestEditAccess && (
              <button
                type="button"
                onClick={onRequestEditAccess}
                title="Request Edit Access"
                className="px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg bg-stone-900 hover:bg-stone-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-semibold tracking-tight transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1 shrink-0"
              >
                <HugeiconsIcon icon={Edit02Icon} size={12} />
                <span className="hidden sm:inline">Request Edit Access</span>
                <span className="sm:hidden text-[11px]">Request</span>
              </button>
            )}
          </div>
        )}

        {/* Theme Toggle */}
        <ThemeToggle variant="icon" />

        {/* Export Button */}
        {(page || databaseData) && (
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 text-xs font-semibold tracking-tight transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            aria-label={isDatabase ? "Export database" : "Export page"}
            title={isDatabase ? "Export Database" : "Export Page"}
          >
            <HugeiconsIcon icon={Download01Icon} size={13} className="text-stone-600 dark:text-zinc-400" />
            <span className="hidden sm:inline">Export</span>
          </button>
        )}

        {/* Shortcut to Workspace Dashboard if workspace member */}
        {isWorkspaceMember && (
          <button
            type="button"
            onClick={onOpenDashboard}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 text-xs font-semibold tracking-tight transition-colors cursor-pointer shrink-0"
          >
            <span>Open in Dashboard</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
          </button>
        )}

        {/* User Profile Avatar / Sign In */}
        {isLoggedIn ? (
          <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-stone-200/80 dark:border-zinc-800 shrink-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-brand-bg text-brand-fg flex items-center justify-center text-xs font-semibold shadow-2xs">
              {(userEmail || 'U').charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-stone-700 dark:text-zinc-300 hidden lg:inline truncate max-w-[140px]">
              {userEmail}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            className="px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-lg bg-brand-bg hover:bg-brand-hover text-brand-fg text-xs font-semibold tracking-tight transition-all shadow-xs cursor-pointer active:scale-98 shrink-0"
          >
            Sign in
          </button>
        )}
      </div>

      {(page || databaseData) && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          page={page}
          isDatabase={isDatabase}
          databaseData={databaseData}
        />
      )}
    </header>
  );
}
