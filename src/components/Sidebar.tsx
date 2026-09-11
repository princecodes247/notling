import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PanelLeftClose } from 'lucide-react';
import {
  Home01Icon,
  Folder01Icon,
  FolderAddIcon,
  Search01Icon,
  Settings02Icon,
  PlusSignIcon,
  Logout01Icon,
} from '@hugeicons/core-free-icons';
import type { PageTreeNode } from '~/server/pages';
import { PageTreeItem } from './PageTreeItem';
import { useUIStore } from '~/store/uiStore';
import type { UserSession } from '~/server/auth';
import { NotlingLogoIcon } from './Icons';


interface SidebarProps {
  workspaceName: string;
  session: UserSession | null;
  treeNodes: PageTreeNode[];
  trashCount?: number;
  activeNav?: string;
  onNavClick?: (nav: string) => void;
  onCreateFolder?: () => void;
  onCreatePage: (parentId?: string) => void;
  onSelectPage: (pageId: string) => void;
  onSoftDelete: (pageId: string) => void;
  onUpdateMeta: (pageId: string, title: string, icon?: string) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  workspaceName = 'Notling Workspace',
  session,
  treeNodes,
  activeNav = 'folders',
  onNavClick,
  onCreateFolder,
  onCreatePage,
  onSelectPage,
  onSoftDelete,
  onUpdateMeta,
  onLogout,
}) => {
  const { toggleSearch, toggleSidebar } = useUIStore();

  return (
    <aside className="w-60 h-full bg-[#fafaf9] flex flex-col shrink-0 select-none text-neutral-800 text-sm font-sans relative">
      {/* 1. Header: Logo + Workspace Name + Collapse Icon */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-transparent">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="text-neutral-900 shrink-0">
            <NotlingLogoIcon className="w-5 h-5" />
          </div>
          <span className="font-semibold text-sm text-neutral-900 truncate tracking-tight">
            {workspaceName || 'Notling Workspace'}
          </span>
        </div>

        <button
          type="button"
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors cursor-pointer"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4 text-neutral-500 hover:text-neutral-800 transition-colors" />
        </button>

      </div>

      {/* 2. Search Bar with '/' badge */}
      <div className="px-3 pb-2 pt-1">
        <button
          type="button"
          onClick={toggleSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-neutral-100/90 hover:bg-neutral-200/80 border border-neutral-200/50 text-neutral-500 text-xs transition-colors group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Search01Icon} size={15} className="text-neutral-400 group-hover:text-neutral-600" />
            <span className="font-normal">Search</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[11px] font-mono text-neutral-400 bg-white rounded border border-neutral-200 shadow-2xs">
            /
          </kbd>
        </button>
      </div>

      {/* 3. Main Navigation Links (Home, Folders, Trash) */}
      <div className="px-2 py-1 flex flex-col gap-0.5">
        {/* Home */}
        <button
          type="button"
          onClick={() => onNavClick?.('home')}
          className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${activeNav === 'home'
            ? 'bg-neutral-100 text-neutral-900 font-semibold'
            : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
            }`}
        >
          <HugeiconsIcon icon={Home01Icon} size={16} className="text-neutral-500 shrink-0" />
          <span>Home</span>
        </button>

        {/* Folders */}
        <button
          type="button"
          onClick={() => onNavClick?.('folders')}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${activeNav === 'folders'
            ? 'bg-neutral-100 text-neutral-900 font-semibold'
            : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
            }`}
        >
          <div className="flex items-center gap-2.5">
            <HugeiconsIcon icon={Folder01Icon} size={16} className="text-neutral-600 shrink-0" />
            <span>Folders</span>
          </div>
          <span className="text-[11px] text-neutral-400">
            {treeNodes.filter((n) => n.children && n.children.length > 0).length || treeNodes.length}
          </span>
        </button>
      </div>

      {/* 4. Folders & Document Tree Section */}
      <div className="flex-1 overflow-y-auto px-2 pt-3 pb-2 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-3 py-1 text-[11px] font-medium text-neutral-400">
          <span className="tracking-wide">Documents & Folders</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onCreateFolder ? onCreateFolder() : onCreatePage()}
              className="p-0.5 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors"
              title="Create new folder"
            >
              <HugeiconsIcon icon={FolderAddIcon} size={15} />
            </button>
            <button
              type="button"
              onClick={() => onCreatePage()}
              className="p-0.5 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors"
              title="Create new page"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={15} />
            </button>
          </div>
        </div>

        <div className="mt-1 flex flex-col gap-0.5">
          {treeNodes.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-neutral-400 flex flex-col items-center gap-1.5">
              <span>No documents yet</span>
              <button
                type="button"
                onClick={() => onCreatePage()}
                className="text-[11px] text-neutral-800 font-medium hover:underline"
              >
                + Create first page
              </button>
            </div>
          ) : (
            treeNodes.map((node) => (
              <PageTreeItem
                key={node.id}
                node={node}
                depth={0}
                onCreateChild={onCreatePage}
                onSelectPage={onSelectPage}
                onSoftDelete={onSoftDelete}
                onUpdateMeta={onUpdateMeta}
              />
            ))
          )}
        </div>
      </div>

      {/* 5. Footer: User Avatar + Name, Settings, Version */}
      <div className="p-3 border-t border-neutral-100 flex flex-col gap-1.5">
        {/* User profile row */}
        <div className="flex items-center justify-between px-1 py-1 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer group">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-200 shrink-0 border border-neutral-200">
              <img
                src={session?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces'}
                alt={session?.name || 'Scotty'}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xs font-medium text-neutral-800 truncate">
              {session?.name ? session.name.split(' ')[0] : 'Scotty'}
            </span>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-opacity"
              title="Sign out"
            >
              <HugeiconsIcon icon={Logout01Icon} size={15} />
            </button>
          )}
        </div>

        {/* Settings row */}
        <button
          type="button"
          onClick={() => onNavClick?.('settings')}
          className={`flex items-center gap-2 px-1 py-1 rounded-lg text-xs transition-colors cursor-pointer ${activeNav === 'settings'
            ? 'bg-neutral-100 text-neutral-900 font-semibold'
            : 'text-neutral-700 hover:bg-neutral-50'
            }`}
        >
          <HugeiconsIcon icon={Settings02Icon} size={15} className="text-neutral-500" />
          <span>Settings</span>
        </button>

        {/* Version label */}
        <div className="px-1 pt-1 text-[11px] text-neutral-400 font-normal">
          v0.0.0
        </div>
      </div>
    </aside>
  );
};
