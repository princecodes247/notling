import React, { useState } from 'react';
import {
  Folder,
  FolderPlus,
  Plus,
  FileText,
  ChevronRight,
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react';
import type { PageTreeNode } from '~/server/pages';

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
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    treeNodes.forEach((n) => {
      init[n.id] = true;
    });
    return init;
  });

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Group into folders (pages with children or designated root pages)
  const folders = treeNodes;

  return (
    <div className="flex-1 w-full h-full bg-white flex flex-col overflow-y-auto select-none font-sans p-6 sm:p-10">
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
              <Plus className="w-3.5 h-3.5" />
              <span>New Document</span>
            </button>
            <button
              type="button"
              onClick={onCreateFolder}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-black hover:bg-neutral-800 text-white text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>New Folder</span>
            </button>
          </div>
        </div>

        {/* Folders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {folders.length === 0 ? (
            <div className="col-span-2 py-16 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-2xl flex flex-col items-center gap-3">
              <Folder className="w-8 h-8 text-neutral-300 stroke-1" />
              <span>No folders created yet. Click "+ New Folder" to organize documents.</span>
              <button
                type="button"
                onClick={onCreateFolder}
                className="px-3 py-1.5 rounded-lg bg-black text-white text-xs font-medium"
              >
                Create First Folder
              </button>
            </div>
          ) : (
            folders.map((folder) => {
              const hasChildren = folder.children && folder.children.length > 0;
              const isExpanded = expandedFolders[folder.id];

              return (
                <div
                  key={folder.id}
                  className="rounded-2xl border border-neutral-200/90 bg-white hover:border-neutral-300 transition-all overflow-hidden flex flex-col shadow-2xs"
                >
                  {/* Folder Top Bar */}
                  <div className="p-4 sm:p-5 flex items-center justify-between border-b border-neutral-100 bg-neutral-50/40">
                    <div
                      className="flex items-center gap-3 min-w-0 cursor-pointer"
                      onClick={() => onSelectPage(folder.id)}
                    >
                      <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-lg shrink-0 shadow-2xs">
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
                        className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 transition-colors"
                        title="Add document to folder"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleFolder(folder.id)}
                        className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 transition-colors"
                        title="Toggle view"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
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
                            className="text-neutral-900 font-medium hover:underline"
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
                            <ChevronRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-600 transition-colors shrink-0" />
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
