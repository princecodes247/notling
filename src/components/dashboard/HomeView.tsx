import React, { useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  FolderAddIcon,
  PlusSignIcon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import type { PageTreeNode } from '~/server/pages';
import { useUIStore } from '~/store/uiStore';

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
  const pageMeta = useUIStore((s) => s.pageMeta);

  const mergedNodes = useMemo(() => {
    function applyMeta(nodes: PageTreeNode[]): PageTreeNode[] {
      return nodes.map((node) => {
        const live = pageMeta[node.id];
        return {
          ...node,
          title: live?.title ?? node.title,
          icon: live?.icon ?? node.icon,
          children: node.children ? applyMeta(node.children) : [],
        };
      });
    }
    return applyMeta(treeNodes);
  }, [treeNodes, pageMeta]);

  // Only actual folders
  const folders = useMemo(
    () => mergedNodes.filter((n) => n.icon === '📁' || n.icon === '📂' || (n.children && n.children.length > 0)),
    [mergedNodes]
  );

  // Recents sorted by last updated / opened first
  const recentDocs = useMemo(() => {
    const all = flattenTreeNodes(mergedNodes).filter(
      (n) => n.icon !== '📁' && n.icon !== '📂'
    );
    return all.sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [mergedNodes]);

  let totalDocs = 0;
  mergedNodes.forEach((n) => {
    if (n.icon !== '📁' && n.icon !== '📂') totalDocs += 1;
    if (n.children) {
      n.children.forEach((c) => {
        if (c.icon !== '📁' && c.icon !== '📂') totalDocs += 1;
      });
    }
  });

  const hasAnyContent = mergedNodes.length > 0;

  return (
    <div className="flex-1 w-full h-full bg-white overflow-y-auto select-none p-4 sm:p-10 pb-6 sm:pb-10 font-sans pt-safe flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
          <div>
            <h1 className="text-2xl sm:text-3xl font-normal text-stone-950 tracking-tight">
              Good afternoon, {userName}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Welcome back to your workspace.
            </p>
          </div>

          {hasAnyContent && (
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onCreateFolder}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-stone-200/90 hover:bg-stone-50 text-stone-800 text-xs font-medium transition-colors cursor-pointer shadow-2xs active-press"
              >
                <HugeiconsIcon icon={FolderAddIcon} size={15} />
                <span>New Folder</span>
              </button>
              <button
                type="button"
                onClick={onCreatePage}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition-colors shadow-2xs cursor-pointer active-press"
              >
                <HugeiconsIcon icon={PlusSignIcon} size={15} />
                <span>New Document</span>
              </button>
            </div>
          )}
        </div>

        {!hasAnyContent ? (
          /* Single Centered Empty State (HIG Deference) */
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 border border-stone-200 text-stone-600 flex items-center justify-center mb-4 shadow-2xs">
              <HugeiconsIcon icon={PlusSignIcon} size={24} />
            </div>
            <h3 className="text-base font-semibold text-stone-950 tracking-tight">
              Your workspace is empty
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mt-1 mb-6 leading-relaxed">
              Create your first document to start organizing notes, specs, and project ideas.
            </p>
            <button
              type="button"
              onClick={onCreatePage}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium shadow-2xs transition-all cursor-pointer active-press"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={15} />
              <span>Create your first document</span>
            </button>
          </div>
        ) : (
          <>
            {/* Workspace Folders Section */}
            {folders.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-stone-900">Workspace Folders</h3>
                  <button
                    type="button"
                    onClick={() => onNavigate('folders')}
                    className="text-xs text-stone-500 hover:text-stone-900 inline-flex items-center gap-1 font-medium cursor-pointer transition-colors"
                  >
                    <span>View all folders</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {folders.slice(0, 3).map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => onSelectPage(folder.id)}
                      className="p-4 rounded-xl border border-stone-200/80 bg-white hover:border-stone-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between h-28"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{folder.icon || '📁'}</span>
                        <span className="text-[10px] text-stone-400 font-medium px-2 py-0.5 rounded-md bg-stone-100">
                          {folder.children?.length || 0} pages
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-stone-900 group-hover:text-black truncate">
                          {folder.title || 'Untitled Folder'}
                        </h4>
                        <span className="text-[10px] text-stone-400">Open folder</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recents Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-900">Recents</h3>
                <button
                  type="button"
                  onClick={onCreatePage}
                  className="text-xs text-stone-500 hover:text-stone-900 inline-flex items-center gap-1 font-medium cursor-pointer transition-colors"
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={13} />
                  <span>New document</span>
                </button>
              </div>

              <div className="flex flex-col divide-y divide-stone-100 rounded-xl border border-stone-200/80 bg-white overflow-hidden shadow-2xs">
                {recentDocs.slice(0, 10).map((node) => (
                  <div
                    key={node.id}
                    onClick={() => onSelectPage(node.id)}
                    className="p-3.5 hover:bg-stone-50/80 flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base shrink-0">{node.icon || '📄'}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-stone-900 group-hover:text-black truncate block">
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
                        <span className="text-[10px] text-stone-400 truncate block max-w-xs sm:max-w-md md:max-w-lg">
                          {node.contentText?.trim()
                            ? node.contentText.trim().replace(/\s+/g, ' ')
                            : node.icon === '📁' || node.icon === '📂'
                              ? (node.children && node.children.length > 0 ? `${node.children.length} document${node.children.length > 1 ? 's' : ''}` : 'Empty folder')
                              : 'Empty document'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-stone-400">
                      <span className="text-[11px] opacity-0 group-hover:opacity-100 transition-opacity font-medium text-stone-500">
                        Open
                      </span>
                      <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="text-stone-400 group-hover:text-stone-700 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
