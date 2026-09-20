import { useState } from 'react';
import { NotlingLogoIcon } from '~/components/Icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { LockIcon, ArrowRight01Icon, Download01Icon, Edit02Icon } from '@hugeicons/core-free-icons';
import { CollaboratorAvatars } from '~/components/CollaboratorAvatars';
import { ExportModal } from '~/components/ExportModal';

interface ShareHeaderProps {
  pageId: string;
  accessLevel: string;
  isLoggedIn: boolean;
  isWorkspaceMember: boolean;
  userEmail?: string | null;
  activeUsers?: any[];
  currentClientId: string;
  page?: any;
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
  onNavigateHome,
  onOpenDashboard,
  onSignIn,
  onRequestEditAccess,
}: ShareHeaderProps) {
  const [isExportOpen, setIsExportOpen] = useState(false);

  return (
    <header className="h-14 border-b border-stone-200/70 px-3.5 sm:px-6 md:px-10 flex items-center justify-between bg-[#fdfcf9]/90 backdrop-blur-md sticky top-0 z-30">
      <div
        className="flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0"
        onClick={onNavigateHome}
      >
        <NotlingLogoIcon className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600 dark:text-brand-400 drop-shadow-2xs" />
        <span className="font-bold text-xs sm:text-base tracking-tight text-neutral-900 dark:text-white">
          Notling
        </span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3 min-w-0">
        {/* Active Collaborator Avatars */}
        <CollaboratorAvatars activeUsers={activeUsers} currentClientId={currentClientId} />

        {/* Access Status Badge & Request Edit Access Button */}
        {accessLevel === 'editor' ? (
          <span className="text-[10px] sm:text-[11px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1 sm:gap-1.5 shadow-2xs shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] animate-pulse" />
            <span className="hidden xs:inline">Can edit</span>
            <span className="xs:hidden">Edit</span>
          </span>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center gap-1 sm:gap-1.5 shadow-2xs shrink-0">
              <HugeiconsIcon icon={LockIcon} size={11} />
              <span className="hidden xs:inline">View only</span>
              <span className="xs:hidden">View</span>
            </span>
            {onRequestEditAccess && (
              <button
                type="button"
                onClick={onRequestEditAccess}
                className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold tracking-tight transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                <HugeiconsIcon icon={Edit02Icon} size={12} />
                <span className="hidden sm:inline">Request Edit Access</span>
                <span className="sm:hidden">Request Edit</span>
              </button>
            )}
          </div>
        )}

        {/* Export Button */}
        {page && (
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold tracking-tight transition-colors cursor-pointer shrink-0"
            aria-label="Export page to Markdown or PDF"
          >
            <HugeiconsIcon icon={Download01Icon} size={13} className="text-stone-600" />
            <span className="hidden sm:inline">Export</span>
          </button>
        )}

        {/* Shortcut to Workspace Dashboard if workspace member */}
        {isWorkspaceMember && (
          <button
            type="button"
            onClick={onOpenDashboard}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold tracking-tight transition-colors cursor-pointer shrink-0"
          >
            <span>Open in Dashboard</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
          </button>
        )}

        {/* User Status / Profile */}
        {isLoggedIn ? (
          <div className="flex items-center gap-2 pl-1.5 sm:pl-2 border-l border-stone-200 shrink-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-brand-bg text-brand-fg flex items-center justify-center text-xs font-semibold shadow-2xs">
              {(userEmail || 'U').charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-stone-700 hidden md:inline truncate max-w-[140px]">
              {userEmail}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg bg-brand-bg hover:bg-brand-hover text-brand-fg text-xs font-semibold tracking-tight transition-all shadow-xs cursor-pointer active:scale-98 shrink-0"
          >
            Sign in
          </button>
        )}
      </div>

      {page && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          page={page}
        />
      )}
    </header>
  );
}
