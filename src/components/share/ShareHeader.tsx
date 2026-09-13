import { useState } from 'react';
import { NotlingLogoIcon } from '~/components/Icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { LockIcon, ArrowRight01Icon, Download01Icon } from '@hugeicons/core-free-icons';
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
}: ShareHeaderProps) {
  const [isExportOpen, setIsExportOpen] = useState(false);

  return (
    <header className="h-14 border-b border-stone-200/70 px-6 sm:px-12 flex items-center justify-between bg-[#fdfcf9]/90 backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center gap-2.5 cursor-pointer" onClick={onNavigateHome}>
        <div className="w-7 h-7 rounded-lg bg-stone-900 text-amber-200/95 flex items-center justify-center shadow-xs">
          <NotlingLogoIcon className="w-3.5 h-3.5" />
        </div>
        <span className="font-semibold text-sm tracking-tight text-stone-900">Notling</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Active Collaborator Avatars */}
        <CollaboratorAvatars activeUsers={activeUsers} currentClientId={currentClientId} />

        {/* Access Status Badge */}
        {accessLevel === 'editor' ? (
          <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1.5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] animate-pulse" />
            <span>Can edit</span>
          </span>
        ) : (
          <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center gap-1.5 shadow-2xs">
            <HugeiconsIcon icon={LockIcon} size={11} />
            <span>View only</span>
          </span>
        )}

        {/* Export Button */}
        {page && (
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold tracking-tight transition-colors cursor-pointer"
            title="Export page to Markdown or PDF"
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
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold tracking-tight transition-colors cursor-pointer"
          >
            <span>Open in Dashboard</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
          </button>
        )}

        {/* User Status / Profile */}
        {isLoggedIn ? (
          <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
            <div className="w-7 h-7 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-semibold shadow-2xs">
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
            className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold tracking-tight transition-all shadow-xs cursor-pointer active:scale-98"
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
