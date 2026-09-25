import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PanelLeftClose, ChevronsUpDown, Check, Plus, Star, Upload, Database } from 'lucide-react';
import {
  Home01Icon,
  Folder01Icon,
  FolderAddIcon,
  Search01Icon,
  Settings02Icon,
  Delete02Icon,
  Loading02Icon,
} from '@hugeicons/core-free-icons';
import type { PageTreeNode } from '~/server/pages';
import { PageTreeItem } from './PageTreeItem';
import { useUIStore } from '~/store/uiStore';
import type { UserSession, UserWorkspaceItem } from '~/server/auth';
import { UserAvatar } from './UserAvatar';
import { WorkspaceAvatar } from './WorkspaceAvatar';
import { cn } from '#/lib/utils';

function getAllPinnedNodes(nodes: PageTreeNode[]): PageTreeNode[] {
  let pinned: PageTreeNode[] = [];
  for (const node of nodes) {
    if (node.isPinned) {
      pinned.push(node);
    }
    if (node.children && node.children.length > 0) {
      pinned = pinned.concat(getAllPinnedNodes(node.children));
    }
  }
  return pinned;
}

interface SidebarProps {
  workspaceName: string;
  session: UserSession | null;
  treeNodes: PageTreeNode[];
  userWorkspaces?: UserWorkspaceItem[];
  isCreatingPage?: boolean;
  isLoading?: boolean;
  onSwitchWorkspace?: (workspaceId: string) => void;
  onOpenCreateWorkspaceModal?: () => void;
  trashCount?: number;
  activeNav?: string;
  onNavClick?: (nav: string) => void;
  onCreateFolder?: () => void;
  onCreatePage: (parentId?: string) => void;
  onCreateDatabase?: () => void;
  onSelectPage: (pageId: string) => void;
  onSoftDelete: (pageId: string) => void;
  onUpdateMeta: (pageId: string, title: string, icon?: string) => void;
  onReorderPage?: (input: { pageId: string; targetParentId: string | null; targetOrder: number }) => void;
  onTogglePin?: (pageId: string) => void;
  onDuplicatePage?: (pageId: string) => void;
  onLogout?: () => void;
}

interface SidebarNavItemProps {
  icon: any;
  isLucide?: boolean;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  badge?: React.ReactNode;
}

const SidebarNavItem: React.FC<SidebarNavItemProps> = ({
  icon: IconComponent,
  isLucide = false,
  label,
  isActive = false,
  onClick,
  badge,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
      isActive
        ? 'bg-stone-200/80 dark:bg-zinc-800 text-stone-900 dark:text-white font-semibold'
        : 'text-stone-600 dark:text-zinc-400 hover:bg-stone-200/50 dark:hover:bg-zinc-800/50 hover:text-stone-900 dark:hover:text-white'
    )}
  >
    <div className="flex items-center gap-2 truncate">
      {isLucide ? (
        <IconComponent className={cn("w-3.5 h-3.5 shrink-0", isActive ? 'text-stone-900 dark:text-white' : 'text-stone-400 dark:text-zinc-500')} />
      ) : (
        <HugeiconsIcon
          icon={IconComponent}
          size={14}
          className={cn("shrink-0", isActive ? 'text-stone-900 dark:text-white' : 'text-stone-400 dark:text-zinc-500')}
        />
      )}
      <span className="truncate">{label}</span>
    </div>
    {badge && <div className="shrink-0 ml-2">{badge}</div>}
  </button>
);

export const SidebarSkeleton: React.FC = () => {
  const BaseSkeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
    <div className={className + "flex flex-col gap-1"}>
      <div className="flex items-center gap-2.5 px-2 py-1.5">
        <div className="w-4 h-4 rounded bg-stone-300/70 dark:bg-zinc-800/80 shrink-0" />
        <div className="h-3.5 w-32 rounded bg-stone-300/70 dark:bg-zinc-800/80" />
      </div>
      <div className="flex items-center gap-2 pl-7 pr-2 py-1">
        <div className="w-3.5 h-3.5 rounded bg-stone-200/80 dark:bg-zinc-800/50 shrink-0" />
        <div className="h-3 w-24 rounded bg-stone-200/80 dark:bg-zinc-800/50" />
      </div>
      <div className="flex items-center gap-2 pl-7 pr-2 py-1">
        <div className="w-3.5 h-3.5 rounded bg-stone-200/80 dark:bg-zinc-800/50 shrink-0" />
        <div className="h-3 w-28 rounded bg-stone-200/80 dark:bg-zinc-800/50" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-2.5 px-1 py-1 animate-pulse select-none">
      <BaseSkeleton />

      <div className="flex flex-col gap-1 pt-1">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-4 h-4 rounded bg-stone-300/70 dark:bg-zinc-800/80 shrink-0" />
          <div className="h-3.5 w-28 rounded bg-stone-300/70 dark:bg-zinc-800/80" />
        </div>
        <div className="flex items-center gap-2 pl-7 pr-2 py-1">
          <div className="w-3.5 h-3.5 rounded bg-stone-200/80 dark:bg-zinc-800/50 shrink-0" />
          <div className="h-3 w-20 rounded bg-stone-200/80 dark:bg-zinc-800/50" />
        </div>
      </div>

      <div className="flex items-center gap-2.5 px-2 py-1.5 pt-1">
        <div className="w-4 h-4 rounded bg-stone-300/70 dark:bg-zinc-800/80 shrink-0" />
        <div className="h-3.5 w-36 rounded bg-stone-300/70 dark:bg-zinc-800/80" />
      </div>
      <div className="flex items-center gap-2.5 px-2 py-1.5">
        <div className="w-4 h-4 rounded bg-stone-300/70 dark:bg-zinc-800/80 shrink-0" />
        <div className="h-3.5 w-24 rounded bg-stone-300/70 dark:bg-zinc-800/80" />
      </div>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  workspaceName = 'Notling Workspace',
  session,
  treeNodes,
  userWorkspaces = [],
  isCreatingPage = false,
  isLoading = false,
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
  onTogglePin,
  onDuplicatePage,
  onCreateDatabase,
  onLogout: _onLogout,
}) => {
  const { toggleSearch, toggleSidebar, setImportOpen } = useUIStore();
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [isRootDropTarget, setIsRootDropTarget] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);

  const workspaceNodes = treeNodes.filter((n) => !n.isShared);
  const sharedNodes = treeNodes.filter((n) => n.isShared === true);
  const pinnedNodes = getAllPinnedNodes(treeNodes);

  return (
    <aside className="w-full md:w-60 h-full bg-white dark:bg-[#121214] flex flex-col shrink-0 select-none text-stone-800 dark:text-zinc-200 text-xs md:text-sm border-r border-stone-200/80 dark:border-zinc-800/80 relative pt-safe pb-safe">
      {/* 1. Header: Workspace Switcher Dropdown + Collapse Icon */}
      <div className="p-3 border-b border-stone-200/60 dark:border-zinc-800/80 flex items-center justify-between relative">
        <div className="relative flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="flex items-center gap-2 p-1 rounded-md hover:bg-stone-200/50 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer w-full text-left min-w-0 group"
          >
            <WorkspaceAvatar
              seed={session?.workspaceIcon || session?.workspaceSlug || session?.workspaceId || workspaceName}
              slug={session?.workspaceSlug}
              name={workspaceName}
              size={24}
            />
            <span className="font-semibold text-xs text-stone-900 dark:text-zinc-100 truncate tracking-tight flex-1">
              {workspaceName || 'Notling Workspace'}
            </span>
            <ChevronsUpDown className="w-3.5 h-3.5 text-stone-400 dark:text-zinc-500 group-hover:text-stone-700 dark:group-hover:text-zinc-300 shrink-0 transition-colors" />
          </button>

          {/* Workspace Dropdown Menu */}
          {showWorkspaceMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowWorkspaceMenu(false)}
              />
              <div className="absolute left-0 top-11 w-56 bg-white dark:bg-[#18181b] border border-stone-200 dark:border-zinc-800 rounded-xl shadow-xl py-1.5 z-50 text-xs flex flex-col">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
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
                          className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-stone-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer ${isActive ? 'bg-stone-50 dark:bg-zinc-800 font-semibold text-stone-900 dark:text-white' : 'text-stone-700 dark:text-zinc-300'
                            }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <WorkspaceAvatar
                              seed={ws.icon || ws.slug || ws.id || ws.name}
                              slug={ws.slug}
                              name={ws.name}
                              size={20}
                            />
                            <span className="truncate text-xs">{ws.name}</span>
                          </div>
                          {isActive && <Check className="w-3.5 h-3.5 text-stone-900 dark:text-white shrink-0" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2 text-stone-700 dark:text-zinc-300 font-semibold text-xs flex items-center justify-between bg-stone-50 dark:bg-zinc-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <WorkspaceAvatar
                          seed={session?.workspaceIcon || session?.workspaceSlug || session?.workspaceId || workspaceName}
                          slug={session?.workspaceSlug}
                          name={workspaceName}
                          size={20}
                        />
                        <span className="truncate text-xs">{workspaceName || 'Notling Workspace'}</span>
                      </div>
                      <Check className="w-3.5 h-3.5 text-stone-900 dark:text-white shrink-0" />
                    </div>
                  )}
                </div>

                <div className="pt-1.5 mt-1 border-t border-stone-100 dark:border-zinc-800 px-1 flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowWorkspaceMenu(false);
                      onOpenCreateWorkspaceModal?.();
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-800/60 flex items-center gap-2 text-stone-700 dark:text-zinc-300 font-medium cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-stone-500 dark:text-zinc-400" />
                    Create new workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowWorkspaceMenu(false);
                      setImportOpen(true);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-800/60 flex items-center gap-2 text-stone-700 dark:text-zinc-300 font-medium cursor-pointer transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-stone-500 dark:text-zinc-400" />
                    Import Notion / Notes
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={toggleSidebar}
          className="p-1 rounded-md text-stone-400 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-200 hover:bg-stone-200/50 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer shrink-0 ml-1"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4 text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-100 transition-colors" />
        </button>
      </div>

      {/* 2. Quick Actions Section (Search + New Document) */}
      <div className="p-2.5 flex flex-col gap-1 border-b border-stone-200/60 dark:border-zinc-800/80">
        <button
          type="button"
          onClick={toggleSearch}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-stone-600 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800/60 hover:text-stone-900 dark:hover:text-white transition-colors w-full text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Search01Icon} size={14} className="text-stone-400 dark:text-zinc-500" />
            <span className="text-xs">Search notes</span>
          </div>
          <kbd className="text-[10px] font-mono text-stone-400 dark:text-zinc-500 bg-stone-200/70 dark:bg-zinc-800 px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>

        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={isCreatingPage}
            onClick={() => !isCreatingPage && onCreatePage()}
            className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[#1f4d3d] dark:text-emerald-400 bg-[#1f4d3d]/10 dark:bg-emerald-950/40 hover:bg-[#1f4d3d]/20 dark:hover:bg-emerald-900/50 font-medium text-xs transition-colors text-left cursor-pointer disabled:opacity-50"
          >
            {isCreatingPage ? (
              <HugeiconsIcon icon={Loading02Icon} size={14} className="animate-spin text-[#1f4d3d] dark:text-emerald-400" />
            ) : (
              <Plus className="w-3.5 h-3.5 text-[#1f4d3d] dark:text-emerald-400" />
            )}
            <span className="truncate">Doc</span>
          </button>

          {onCreateDatabase && (
            <button
              type="button"
              onClick={onCreateDatabase}
              className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-medium text-xs transition-colors text-left cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="truncate">Database</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Navigation Links (Home, Folders, Import, Settings, Trash) */}
      <div className="p-2 space-y-0.5">
        <SidebarNavItem
          icon={Home01Icon}
          label="Home"
          isActive={activeNav === 'home'}
          onClick={() => onNavClick?.('home')}
        />

        <SidebarNavItem
          icon={Folder01Icon}
          label="Folders"
          isActive={activeNav === 'folders'}
          onClick={() => onNavClick?.('folders')}
          badge={
            <span className="text-[10px] bg-stone-200 dark:bg-zinc-800 font-medium text-stone-600 dark:text-zinc-400 px-1.5 py-0.2 rounded-full">
              {workspaceNodes.filter((n) => n.children && n.children.length > 0).length || workspaceNodes.length}
            </span>
          }
        />

        <SidebarNavItem
          icon={Upload}
          isLucide
          label="Import"
          isActive={false}
          onClick={() => setImportOpen(true)}
        />

        <SidebarNavItem
          icon={Settings02Icon}
          label="Workspace Settings"
          isActive={activeNav === 'settings'}
          onClick={() => onNavClick?.('settings')}
        />

        <SidebarNavItem
          icon={Delete02Icon}
          label="Trash"
          isActive={activeNav === 'trash'}
          onClick={() => onNavClick?.('trash')}
          badge={
            trashCount !== undefined && trashCount > 0 ? (
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded text-rose-700 dark:text-rose-400">
                {trashCount}
              </span>
            ) : undefined
          }
        />
      </div>

      {/* 4. Folders & Document Tree Section */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4 no-scrollbar min-h-0">
        {isLoading ? (
          <SidebarSkeleton />
        ) : (
          <>
            {/* Favorites / Pinned Section */}
            {pinnedNodes.length > 0 && (
              <div>
                <div className="px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 tracking-wider uppercase flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                    <span>Favorites</span>
                  </div>
                </div>
                <div className="mt-1 space-y-0.5">
                  {pinnedNodes.map((node) => (
                    <PageTreeItem
                      key={`pinned-${node.id}`}
                      node={node}
                      depth={0}
                      onCreateChild={onCreatePage}
                      onSelectPage={onSelectPage}
                      onSoftDelete={onSoftDelete}
                      onUpdateMeta={onUpdateMeta}
                      onReorderPage={onReorderPage}
                      onTogglePin={onTogglePin}
                      onDuplicatePage={onDuplicatePage}
                      draggedPageId={draggedPageId}
                      setDraggedPageId={setDraggedPageId}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold text-stone-400 dark:text-zinc-500 tracking-wider uppercase flex items-center justify-between">
                <span>Workspace Pages</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={isCreatingPage}
                    onClick={() => !isCreatingPage && (onCreateFolder ? onCreateFolder() : onCreatePage())}
                    className="p-0.5 rounded hover:bg-stone-200/70 dark:hover:bg-zinc-800/70 text-stone-400 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
                    title="Create new folder"
                  >
                    <HugeiconsIcon icon={FolderAddIcon} size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={isCreatingPage}
                    onClick={() => !isCreatingPage && onCreatePage()}
                    className="p-0.5 rounded hover:bg-stone-200/70 dark:hover:bg-zinc-800/70 text-stone-400 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
                    title="Create new page"
                  >
                    {isCreatingPage ? (
                      <HugeiconsIcon icon={Loading02Icon} size={14} className="animate-spin text-stone-600 dark:text-zinc-400" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              <div
                className={`mt-1 flex flex-col gap-0.5 rounded-lg transition-colors min-h-[40px] ${isRootDropTarget ? 'bg-stone-200/50 dark:bg-zinc-800/50 ring-1 ring-stone-300 dark:ring-zinc-700' : ''
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
                  <div className="px-3 py-4 text-center text-xs text-stone-400 dark:text-zinc-500 flex flex-col items-center gap-1.5">
                    <span>No documents yet</span>
                    <button
                      type="button"
                      disabled={isCreatingPage}
                      onClick={() => !isCreatingPage && onCreatePage()}
                      className="text-[11px] text-stone-800 dark:text-zinc-200 font-medium hover:underline disabled:opacity-50"
                    >
                      {isCreatingPage ? 'Creating page...' : '+ Create first page'}
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
                      onTogglePin={onTogglePin}
                      onDuplicatePage={onDuplicatePage}
                      draggedPageId={draggedPageId}
                      setDraggedPageId={setDraggedPageId}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Shared With Me Section */}
            {sharedNodes.length > 0 && (
              <div>
                <div className="px-2.5 py-1 text-[11px] font-semibold text-stone-400 dark:text-zinc-500 tracking-wider uppercase flex items-center justify-between">
                  <span>Shared with me</span>
                </div>
                <div className="mt-1 space-y-0.5">
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
                      onTogglePin={onTogglePin}
                      onDuplicatePage={onDuplicatePage}
                      draggedPageId={draggedPageId}
                      setDraggedPageId={setDraggedPageId}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 5. User Footer in Sidebar */}
      <div className="p-3 border-t border-stone-200/60 dark:border-zinc-800/80 flex items-center justify-between bg-white/50 dark:bg-zinc-900/40">
        <button
          type="button"
          onClick={() => onNavClick?.('profile')}
          className="flex items-center gap-2 min-w-0 text-left hover:opacity-80 transition-opacity cursor-pointer group flex-1"
        >
          <UserAvatar
            avatarUrl={session?.avatarUrl}
            email={session?.email}
            name={session?.name}
            size={24}
            className="border border-stone-300/80 dark:border-zinc-700/80 shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-stone-800 dark:text-zinc-200 text-xs leading-tight truncate group-hover:underline">
              {session?.name ? session.name.split(' ')[0] : 'Workspace Member'}
            </span>
            <span className="text-[10px] text-stone-400 dark:text-zinc-500 leading-tight truncate">
              {session?.email || 'authenticated'}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavClick?.('profile')}
          className={cn(
            "p-1.5 rounded-md transition-colors cursor-pointer shrink-0 ml-1",
            activeNav === 'profile'
              ? "bg-stone-200 dark:bg-zinc-800 text-stone-900 dark:text-zinc-100"
              : "text-stone-400 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-200 hover:bg-stone-200/50 dark:hover:bg-zinc-800/60"
          )}
          title="Profile Settings"
        >
          <HugeiconsIcon icon={Settings02Icon} size={15} />
        </button>
      </div>
    </aside>
  );
};
