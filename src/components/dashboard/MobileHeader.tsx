import { Menu } from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, PlusSignIcon } from '@hugeicons/core-free-icons';

interface MobileHeaderProps {
  workspaceName: string;
  isCreatingPage: boolean;
  onOpenMenu: () => void;
  onOpenSearch: () => void;
  onCreatePage: () => void;
}

export function MobileHeader({
  workspaceName,
  isCreatingPage,
  onOpenMenu,
  onOpenSearch,
  onCreatePage,
}: MobileHeaderProps) {
  return (
    <header className="md:hidden py-2.5 flex items-center justify-between px-3.5 bg-[#f8f7f4] dark:bg-[#18181b] text-stone-900 dark:text-zinc-100 border-b border-stone-200/90 dark:border-zinc-800 shrink-0 z-30 shadow-2xs">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          className="p-1.5 rounded-lg text-stone-700 dark:text-zinc-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer active-press"
          title="Open menu"
        >
          <Menu className="w-5 h-5 text-stone-800 dark:text-zinc-200" />
        </button>
        <span className="text-sm font-semibold text-stone-900 dark:text-zinc-100 truncate max-w-[180px]">
          {workspaceName}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenSearch}
          className="p-1.5 rounded-lg text-stone-700 dark:text-zinc-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer active-press"
          title="Search workspace"
        >
          <HugeiconsIcon icon={Search01Icon} size={18} />
        </button>
        <button
          type="button"
          disabled={isCreatingPage}
          onClick={onCreatePage}
          className="p-1.5 rounded-lg text-stone-700 dark:text-zinc-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer active-press disabled:opacity-50 disabled:cursor-not-allowed"
          title="New document"
        >
          <HugeiconsIcon icon={PlusSignIcon} size={18} />
        </button>
      </div>
    </header>
  );
}
