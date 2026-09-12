import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PanelLeftClose, ChevronsUpDown, Check, Plus } from 'lucide-react';
import {
  Home01Icon,
  Folder01Icon,
  FolderAddIcon,
  Search01Icon,
  Settings02Icon,
  PlusSignIcon,
  Logout01Icon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import type { PageTreeNode } from '~/server/pages';
import { PageTreeItem } from './PageTreeItem';
import { useUIStore } from '~/store/uiStore';
import type { UserSession, UserWorkspaceItem } from '~/server/auth';
import { NotlingLogoIcon } from './Icons';
import { UserAvatar } from './UserAvatar';


interface SidebarProps {
  workspaceName: string;
  session: UserSession | null;
  treeNodes: PageTreeNode[];
  userWorkspaces?: UserWorkspaceItem[];
  onSwitchWorkspace?: (workspaceId: string) => void;
  onOpenCreateWorkspaceModal?: () => void;
  trashCount?: number;
  activeNav?: string;
  onNavClick?: (nav: string) => void;
  onCreateFolder?: () => void;
  onCreatePage: (parentId?: string) => void;
  onSelectPage: (pageId: string) => void;
  onSoftDelete: (pageId: string) => void;
  onUpdateMeta: (pageId: string, title: string, icon?: string) => void;
  onReorderPage?: (input: { pageId: string; targetParentId: string | null; targetOrder: number }) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  workspaceName = 'Notling Workspace',
  session,
  treeNodes,
  userWorkspaces = [],
  onSwitchWorkspace,
  onOpenCreateWorkspaceModal,
  trashCount,
  activeNav = 'folders',
  onNavClick,
  onCreateFolder,
  onCreatePage,
  onSelectPage,
  onSoftDelete,
  onUpdateMeta,
  onReorderPage,
  onLogout,
}) => {
  const { toggleSearch, toggleSidebar } = useUIStore();
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [isRootDropTarget, setIsRootDropTarget] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);

  const workspaceNodes = treeNodes.filter((n) => !n.isShared);
  const sharedNodes = treeNodes.filter((n) => n.isShared === true);

  return (
    <aside className="w-60 h-full bg-[#f9f8f5] flex flex-col shrink-0 select-none text-stone-800 text-sm border-r border-stone-200/60 relative">
      {/* 1. Header: Workspace Switcher Dropdown + Collapse Icon */}
      <div className="h-14 px-3 flex items-center justify-between border-b border-stone-200/40 relative">
        <div className="relative flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer w-full text-left min-w-0 group"
          >
            <div className="w-7 h-7 rounded-lg bg-stone-900 text-amber-200/95 flex items-center justify-center shrink-0 shadow-xs ring-1 ring-stone-900/10 text-xs">
              {session?.workspaceIcon || <NotlingLogoIcon className="w-3.5 h-3.5" />}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-semibold text-xs text-stone-900 truncate tracking-tight flex items-center gap-1">
                <span className="truncate">{workspaceName || 'Notling Workspace'}</span>
                <ChevronsUpDown className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 shrink-0 transition-colors" />
              </span>
            </div>
          </button>

          {/* Workspace Dropdown Menu */}
          {showWorkspaceMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowWorkspaceMenu(false)}
              />
              <div className="absolute left-0 top-11 w-56 bg-white border border-stone-200 rounded-xl shadow-xl py-1.5 z-50 text-xs flex flex-col">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Workspaces
                </div>

                <div className="flex flex-col max-h-48 overflow-y-auto my-0.5">
                  {userWorkspaces && userWorkspaces.length > 0 ? (
                    userWorkspaces.map((ws) => {
                      const isActive = ws.id === session?.workspaceId;
                      return (
                        <button
                          key={ws.id}
                          type="button"
                          onClick={() => {
                            setShowWorkspaceMenu(false);
                            if (!isActive) {
                              onSwitchWorkspace?.(ws.id);
                            }
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-stone-100 transition-colors cursor-pointer ${isActive ? 'bg-stone-50 font-semibold text-stone-900' : 'text-stone-700'
                            }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm shrink-0">{ws.icon || '🚀'}</span>
                            <span className="truncate text-xs">{ws.name}</span>
                          </div>
                          {isActive && <Check className="w-3.5 h-3.5 text-stone-900 shrink-0" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2 text-stone-700 font-semibold text-xs flex items-center justify-between bg-stone-50">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm shrink-0">{session?.workspaceIcon || '🚀'}</span>
                        <span className="truncate">{workspaceName}</span>
                      </div>
                      <Check className="w-3.5 h-3.5 text-stone-900 shrink-0" />
                    </div>
                  )}
                </div>

                <div className="pt-1.5 mt-1 border-t border-stone-100 px-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowWorkspaceMenu(false);
                      onOpenCreateWorkspaceModal?.();
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-stone-100 flex items-center gap-2 text-stone-700 font-medium cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-stone-500" />
                    Create new workspace
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer shrink-0 ml-1"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4 text-stone-500 hover:text-stone-800 transition-colors" />
        </button>
      </div>

      {/* 2. Search Bar with '/' badge */}
      <div className="px-3 pb-2 pt-2.5">
        <button
          type="button"
          onClick={toggleSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-stone-200/40 hover:bg-stone-200/70 border border-stone-200/70 text-stone-500 text-xs transition-colors group cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Search01Icon} size={14} className="text-stone-400 group-hover:text-stone-600" />
            <span className="font-normal text-stone-500">Search workspace</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-stone-400 bg-white/90 rounded border border-stone-200 shadow-2xs">
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
          className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${activeNav === 'home'
            ? 'bg-stone-200/70 text-stone-900 font-semibold shadow-2xs'
            : 'text-stone-600 hover:bg-stone-100/80 hover:text-stone-900'
            }`}
        >
          <HugeiconsIcon icon={Home01Icon} size={15} className={activeNav === 'home' ? 'text-stone-900 shrink-0' : 'text-stone-500 shrink-0'} />
          <span>Home</span>
        </button>

        {/* Folders */}
        <button
          type="button"
          onClick={() => onNavClick?.('folders')}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${activeNav === 'folders'
            ? 'bg-stone-200/70 text-stone-900 font-semibold shadow-2xs'
            : 'text-stone-600 hover:bg-stone-100/80 hover:text-stone-900'
            }`}
        >
          <div className="flex items-center gap-2.5">
            <HugeiconsIcon icon={Folder01Icon} size={15} className={activeNav === 'folders' ? 'text-stone-900 shrink-0' : 'text-stone-500 shrink-0'} />
            <span>Folders</span>
          </div>
          <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-stone-200/60 text-stone-500">
            {workspaceNodes.filter((n) => n.children && n.children.length > 0).length || workspaceNodes.length}
          </span>
        </button>

        {/* Trash */}
        <button
          type="button"
          onClick={() => onNavClick?.('trash')}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${activeNav === 'trash'
            ? 'bg-stone-200/70 text-stone-900 font-semibold shadow-2xs'
            : 'text-stone-600 hover:bg-stone-100/80 hover:text-stone-900'
            }`}
        >
          <div className="flex items-center gap-2.5">
            <HugeiconsIcon icon={Delete02Icon} size={15} className={activeNav === 'trash' ? 'text-stone-900 shrink-0' : 'text-stone-500 shrink-0'} />
            <span>Trash</span>
          </div>
          {trashCount !== undefined && trashCount > 0 && (
            <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded ${activeNav === 'trash' ? 'text-rose-800' : 'text-rose-700'}`}>
              {trashCount}
            </span>
          )}
        </button>
      </div>

      {/* 4. Folders & Document Tree Section */}
      <div className="flex-1 overflow-y-auto px-2 pt-3 pb-2 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
          <span>Workspace Pages</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onCreateFolder ? onCreateFolder() : onCreatePage()}
              className="p-1 rounded-md hover:bg-stone-200/70 text-stone-400 hover:text-stone-700 transition-colors"
              title="Create new folder"
            >
              <HugeiconsIcon icon={FolderAddIcon} size={14} />
            </button>
            <button
              type="button"
              onClick={() => onCreatePage()}
              className="p-1 rounded-md hover:bg-stone-200/70 text-stone-400 hover:text-stone-700 transition-colors"
              title="Create new page"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={14} />
            </button>
          </div>
        </div>

        <div
          className={`mt-1 flex flex-col gap-0.5 rounded-lg transition-colors min-h-[40px] ${isRootDropTarget ? 'bg-stone-200/50 ring-1 ring-stone-300' : ''
            }`}
          onDragOver={(e) => {
            e.preventDefault();
            if (draggedPageId) {
              setIsRootDropTarget(true);
            }
          }}
          onDragLeave={() => setIsRootDropTarget(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsRootDropTarget(false);
            if (draggedPageId) {
              onReorderPage?.({
                pageId: draggedPageId,
                targetParentId: null,
                targetOrder: workspaceNodes.length,
              });
              setDraggedPageId(null);
            }
          }}
        >
          {workspaceNodes.length === 0 ? (
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
            workspaceNodes.map((node) => (
              <PageTreeItem
                key={node.id}
                node={node}
                depth={0}
                onCreateChild={onCreatePage}
                onSelectPage={onSelectPage}
                onSoftDelete={onSoftDelete}
                onUpdateMeta={onUpdateMeta}
                onReorderPage={onReorderPage}
                draggedPageId={draggedPageId}
                setDraggedPageId={setDraggedPageId}
              />
            ))
          )}
        </div>

        {/* 5. Shared With Me Section */}
        {sharedNodes.length > 0 && (
          <div className="mt-4 flex flex-col gap-0.5">
            <div className="flex items-center justify-between px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              <div className="flex items-center gap-1.5">
                <span>Shared with me</span>
              </div>
            </div>
            <div className="mt-0.5 flex flex-col gap-0.5">
              {sharedNodes.map((node) => (
                <PageTreeItem
                  key={node.id}
                  node={node}
                  depth={0}
                  onCreateChild={onCreatePage}
                  onSelectPage={onSelectPage}
                  onSoftDelete={onSoftDelete}
                  onUpdateMeta={onUpdateMeta}
                  onReorderPage={onReorderPage}
                  draggedPageId={draggedPageId}
                  setDraggedPageId={setDraggedPageId}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. Footer: User Avatar + Name, Settings, Version */}
      <div className="p-3 border-t border-stone-200/50 flex flex-col gap-1">
        {/* User profile row */}
        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-stone-200/50 transition-colors cursor-pointer group">
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar
              avatarUrl={session?.avatarUrl}
              name={session?.name}
              size={24}
              className="border border-stone-300/80 shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-stone-800 truncate">
                {session?.name ? session.name.split(' ')[0] : 'Workspace Member'}
              </span>
              <span className="text-[10px] text-stone-400 font-mono truncate">
                {session?.email || 'authenticated'}
              </span>
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition-all"
              title="Sign out"
            >
              <HugeiconsIcon icon={Logout01Icon} size={14} />
            </button>
          )}
        </div>

        {/* Settings row */}
        <button
          type="button"
          onClick={() => onNavClick?.('settings')}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${activeNav === 'settings'
            ? 'bg-stone-200/70 text-stone-900 font-semibold shadow-2xs'
            : 'text-stone-700 hover:bg-stone-200/40'
            }`}
        >
          <HugeiconsIcon icon={Settings02Icon} size={15} className="text-stone-500" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
