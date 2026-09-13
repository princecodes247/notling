import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Folder01Icon,
  FolderAddIcon,
  PlusSignIcon,
  ArrowRight01Icon,
  ArrowDown01Icon,
} from '@hugeicons/core-free-icons';
import type { PageTreeNode } from '~/server/pages';
import { useUIStore } from '~/store/uiStore';

interface FoldersViewProps {
  treeNodes: PageTreeNode[];
  onSelectPage: (id: string) => void;
  onCreateFolder: () => void;
  onCreateDocument: (folderId?: string) => void;
}

export const FoldersView: React.FC<FoldersViewProps> = ({
  treeNodes,
  onSelectPage,
  onCreateFolder,
  onCreateDocument,
}) => {
  const pageMeta = useUIStore((s) => s.pageMeta);

  const mergedNodes = React.useMemo(() => {
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

  // Filter treeNodes so only actual folders are shown in FoldersView
  const folders = mergedNodes.filter(
    (node) => node.icon === '📁' || node.icon === '📂' || (node.children && node.children.length > 0)
  );

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    folders.forEach((n) => {
      init[n.id] = true;
    });
    return init;
  });

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex-1 w-full h-full bg-white flex flex-col overflow-y-auto select-none font-sans p-4 sm:p-10 pb-6 sm:pb-10 pt-safe">
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
          <div>
            <h1 className="text-2xl font-normal text-neutral-950 tracking-tight">Folders & Collections</h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Organize your documents, project briefs, and meeting notes into structured folders.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onCreateDocument()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-800 text-xs font-medium transition-colors cursor-pointer"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={15} />
              <span>New Document</span>
            </button>
            <button
              type="button"
              onClick={onCreateFolder}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-black hover:bg-neutral-800 text-white text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            >
              <HugeiconsIcon icon={FolderAddIcon} size={15} />
              <span>New Folder</span>
            </button>
          </div>
        </div>

        {/* Folders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {folders.length === 0 ? (
            <div className="col-span-1 md:col-span-2 py-16 px-4 text-center border border-stone-200/80 rounded-2xl flex flex-col items-center justify-center gap-3 bg-stone-50/40 my-auto">
              <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200/90 text-stone-600 flex items-center justify-center shadow-2xs">
                <HugeiconsIcon icon={Folder01Icon} size={22} />
              </div>
              <h3 className="text-base font-semibold text-stone-900 tracking-tight mt-1">
                No folders created yet
              </h3>
              <p className="text-xs text-stone-500 max-w-sm leading-relaxed">
                Organize your workspace documents, project plans, and research notes into custom folders.
              </p>
              <button
                type="button"
                onClick={onCreateFolder}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium cursor-pointer shadow-2xs transition-all active-press"
              >
                <HugeiconsIcon icon={FolderAddIcon} size={15} />
                <span>Create your first folder</span>
              </button>
            </div>
          ) : (
            folders.map((folder) => {
              const hasChildren = folder.children && folder.children.length > 0;
              const isExpanded = expandedFolders[folder.id];

              return (
                <div
                  key={folder.id}
                  className="rounded-xl border border-neutral-200/90 bg-white hover:border-neutral-300 transition-all overflow-hidden flex flex-col shadow-2xs"
                >
                  {/* Folder Top Bar */}
                  <div className="p-4 sm:p-5 flex items-center justify-between border-b border-neutral-100 bg-neutral-50/40">
                    <div
                      className="flex items-center gap-3 min-w-0 cursor-pointer"
                      onClick={() => onSelectPage(folder.id)}
                    >
                      <div className="w-9 h-9 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-lg shrink-0 shadow-2xs">
                        {folder.icon || '📁'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-neutral-900 truncate">
                          {folder.title || 'Untitled Folder'}
                        </h3>
                        <span className="text-[11px] text-neutral-400">
                          {folder.children?.length || 0} documents inside
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onCreateDocument(folder.id)}
                        className="p-1.5 rounded-md hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 transition-colors"
                        title="Add document to folder"
                      >
                        <HugeiconsIcon icon={PlusSignIcon} size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleFolder(folder.id)}
                        className="p-1.5 rounded-md hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 transition-colors"
                        title="Toggle view"
                      >
                        {isExpanded ? (
                          <HugeiconsIcon icon={ArrowDown01Icon} size={15} />
                        ) : (
                          <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Documents List inside Folder */}
                  {isExpanded && (
                    <div className="p-3 flex flex-col divide-y divide-neutral-100">
                      {!hasChildren ? (
                        <div className="py-4 text-center text-xs text-neutral-400">
                          Empty folder &bull;{' '}
                          <button
                            type="button"
                            onClick={() => onCreateDocument(folder.id)}
                            className="text-neutral-900 font-medium hover:underline cursor-pointer"
                          >
                            + Add page
                          </button>
                        </div>
                      ) : (
                        folder.children.map((child) => (
                          <div
                            key={child.id}
                            onClick={() => onSelectPage(child.id)}
                            className="p-2.5 rounded-lg hover:bg-neutral-50 flex items-center justify-between cursor-pointer group transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-sm shrink-0">{child.icon || '📄'}</span>
                              <span className="text-xs font-medium text-neutral-800 group-hover:text-black truncate">
                                {child.title || 'Untitled Page'}
                              </span>
                            </div>
                            <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="text-neutral-300 group-hover:text-neutral-600 transition-colors shrink-0" />
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
