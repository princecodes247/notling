import React, { useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  FolderAddIcon,
  PlusSignIcon,
  ArrowRight01Icon,
  Clock01Icon,
} from '@hugeicons/core-free-icons';
import type { PageTreeNode } from '~/server/pages';

interface HomeViewProps {
  userName?: string;
  treeNodes: PageTreeNode[];
  onSelectPage: (id: string) => void;
  onCreateFolder: () => void;
  onCreatePage: () => void;
  onNavigate: (nav: string) => void;
}

function flattenTreeNodes(nodes: PageTreeNode[]): PageTreeNode[] {
  let result: PageTreeNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children?.length) {
      result = result.concat(flattenTreeNodes(node.children));
    }
  }
  return result;
}

export const HomeView: React.FC<HomeViewProps> = ({
  userName = 'Scotty',
  treeNodes,
  onSelectPage,
  onCreateFolder,
  onCreatePage,
  onNavigate,
}) => {
  // Only actual folders
  const folders = useMemo(
    () => treeNodes.filter((n) => n.icon === '📁' || n.icon === '📂' || (n.children && n.children.length > 0)),
    [treeNodes]
  );

  // Recents sorted by last updated / opened first
  const recentDocs = useMemo(() => {
    const all = flattenTreeNodes(treeNodes).filter(
      (n) => n.icon !== '📁' && n.icon !== '📂'
    );
    return all.sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [treeNodes]);

  let totalDocs = 0;
  treeNodes.forEach((n) => {
    if (n.icon !== '📁' && n.icon !== '📂') totalDocs += 1;
    if (n.children) {
      n.children.forEach((c) => {
        if (c.icon !== '📁' && c.icon !== '📂') totalDocs += 1;
      });
    }
  });

  return (
    <div className="flex-1 w-full h-full bg-white overflow-y-auto select-none p-6 sm:p-10 font-sans">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
          <div>
            <h1 className="text-2xl sm:text-3xl font-normal text-neutral-950 tracking-tight">
              Good afternoon, {userName}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Welcome back to your workspace. All documents and folders are synced to PostgreSQL.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onCreateFolder}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-stone-200/90 hover:bg-stone-50 text-stone-800 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
            >
              <HugeiconsIcon icon={FolderAddIcon} size={15} />
              <span>New Folder</span>
            </button>
            <button
              type="button"
              onClick={onCreatePage}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition-colors shadow-2xs cursor-pointer active:scale-98"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={15} />
              <span>New Document</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900">Workspace Folders</h3>
            <button
              type="button"
              onClick={() => onNavigate('folders')}
              className="text-xs text-neutral-500 hover:text-black flex items-center gap-1 cursor-pointer"
            >
              <span>View all folders</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {folders.length === 0 ? (
              <div className="col-span-3 p-4 border border-dashed border-neutral-200 rounded-lg text-center text-xs text-neutral-400">
                No folders created yet. Click "+ New Folder" to create one.
              </div>
            ) : (
              folders.slice(0, 3).map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => onSelectPage(folder.id)}
                  className="p-4 rounded-lg border border-neutral-200/90 bg-white hover:border-neutral-300 transition-all cursor-pointer group flex flex-col justify-between h-28 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{folder.icon || '📁'}</span>
                    <span className="text-[10px] text-neutral-400 font-medium px-2 py-0.5 rounded bg-neutral-100">
                      {folder.children?.length || 0} pages
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-900 group-hover:text-black truncate">
                      {folder.title || 'Untitled Folder'}
                    </h4>
                    <span className="text-[10px] text-neutral-400">Click to open folder</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-neutral-900">Recents</h3>
              <HugeiconsIcon icon={Clock01Icon} size={14} className="text-neutral-400" />
            </div>
            <button
              type="button"
              onClick={onCreatePage}
              className="text-xs text-neutral-500 hover:text-black cursor-pointer font-medium"
            >
              + Add page
            </button>
          </div>

          <div className="flex flex-col divide-y divide-neutral-100 rounded-lg border border-neutral-200/90 bg-white overflow-hidden shadow-2xs">
            {recentDocs.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-400">
                No documents created yet. Click "+ New Document" to start.
              </div>
            ) : (
              recentDocs.slice(0, 10).map((node) => (
                <div
                  key={node.id}
                  onClick={() => onSelectPage(node.id)}
                  className="p-3.5 hover:bg-neutral-50 flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base shrink-0">{node.icon || '📄'}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-neutral-900 group-hover:text-black truncate block">
                          {node.title || 'Untitled Document'}
                        </span>
                        {node.visibility === 'public' || node.visibility === 'public_edit' ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200/80 font-medium shrink-0">
                            Public
                          </span>
                        ) : node.isShared ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200/80 font-medium shrink-0">
                            Shared
                          </span>
                        ) : null}
                      </div>
                      <span className="text-[10px] text-neutral-400 truncate block max-w-xs sm:max-w-md md:max-w-lg">
                        {node.contentText?.trim() || 'No additional content'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-neutral-400">
                    <span className="text-[11px] opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                      Open
                    </span>
                    <HugeiconsIcon icon={ArrowRight01Icon} size={15} className="text-neutral-400 group-hover:text-neutral-700 transition-colors" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
