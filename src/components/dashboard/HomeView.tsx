import React from 'react';
import {
  Folder,
  FolderPlus,
  FileText,
  Users,
  ArrowUpRight,
  Plus,
  Clock,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Database,
} from 'lucide-react';
import type { PageTreeNode } from '~/server/pages';

interface HomeViewProps {
  userName?: string;
  treeNodes: PageTreeNode[];
  onSelectPage: (id: string) => void;
  onCreateFolder: () => void;
  onCreatePage: () => void;
  onNavigate: (nav: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  userName = 'Scotty',
  treeNodes,
  onSelectPage,
  onCreateFolder,
  onCreatePage,
  onNavigate,
}) => {
  const totalFolders = treeNodes.length;
  let totalDocs = 0;
  treeNodes.forEach((n) => {
    totalDocs += 1;
    if (n.children) totalDocs += n.children.length;
  });

  return (
    <div className="flex-1 w-full h-full bg-white overflow-y-auto select-none p-6 sm:p-10 font-sans">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        {/* 1. Header Greeting */}
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-800 text-xs font-medium transition-colors cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>New Folder</span>
            </button>
            <button
              type="button"
              onClick={onCreatePage}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-black hover:bg-neutral-800 text-white text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Document</span>
            </button>
          </div>
        </div>

        {/* 2. Key Metrics Cards (Folders, Documents, Database Index, Collaborators) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => onNavigate('folders')}
            className="p-4 rounded-xl border border-neutral-200/90 bg-white hover:border-neutral-300 hover:shadow-2xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-neutral-400 mb-3">
              <span className="text-xs font-medium text-neutral-600">Active Folders</span>
              <Folder className="w-4 h-4 text-neutral-400" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-neutral-900">{totalFolders}</div>
              <div className="text-[11px] text-neutral-500 mt-1">Collections organized</div>
            </div>
          </div>

          <div
            onClick={() => onNavigate('folders')}
            className="p-4 rounded-xl border border-neutral-200/90 bg-white hover:border-neutral-300 hover:shadow-2xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-neutral-400 mb-3">
              <span className="text-xs font-medium text-neutral-600">Total Documents</span>
              <FileText className="w-4 h-4 text-neutral-400" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-neutral-900">{totalDocs}</div>
              <div className="text-[11px] text-neutral-500 mt-1">Instant full-text indexed</div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200/90 bg-white flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-400 mb-3">
              <span className="text-xs font-medium text-neutral-600">Storage Engine</span>
              <Database className="w-4 h-4 text-neutral-400" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-neutral-900">Postgres</div>
              <div className="text-[11px] text-emerald-600 font-medium mt-1">GIN tsvector active</div>
            </div>
          </div>

          <div
            onClick={() => onNavigate('settings')}
            className="p-4 rounded-xl border border-neutral-200/90 bg-white hover:border-neutral-300 hover:shadow-2xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-neutral-400 mb-3">
              <span className="text-xs font-medium text-neutral-600">Collaborators</span>
              <Users className="w-4 h-4 text-neutral-400" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-neutral-900">Team</div>
              <div className="text-[11px] text-neutral-500 mt-1">Workspace synced</div>
            </div>
          </div>
        </div>

        {/* 3. Folders Quick Showcase */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900">Workspace Folders</h3>
            <button
              type="button"
              onClick={() => onNavigate('folders')}
              className="text-xs text-neutral-500 hover:text-black flex items-center gap-1 cursor-pointer"
            >
              <span>View all folders</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {treeNodes.slice(0, 3).map((folder) => (
              <div
                key={folder.id}
                onClick={() => onSelectPage(folder.id)}
                className="p-4 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 transition-all cursor-pointer group flex flex-col justify-between h-28"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">{folder.icon || '📁'}</span>
                  <span className="text-[10px] text-neutral-400 font-medium px-2 py-0.5 rounded bg-neutral-100">
                    {folder.children?.length || 0} pages
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-neutral-900 group-hover:text-black truncate">
                    {folder.title}
                  </h4>
                  <span className="text-[10px] text-neutral-400">Click to open folder</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Recent Workspace Documents */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900">Recent Documents</h3>
            <button
              type="button"
              onClick={onCreatePage}
              className="text-xs text-neutral-500 hover:text-black cursor-pointer"
            >
              + Add page
            </button>
          </div>

          <div className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200/90 bg-white overflow-hidden shadow-2xs">
            {treeNodes.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-400">
                No documents created yet. Click "+ New Document" to start.
              </div>
            ) : (
              treeNodes.slice(0, 5).map((node) => (
                <div
                  key={node.id}
                  onClick={() => onSelectPage(node.id)}
                  className="p-3.5 hover:bg-neutral-50 flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base shrink-0">{node.icon || '📄'}</span>
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-neutral-900 group-hover:text-black truncate block">
                        {node.title || 'Untitled Document'}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        PostgreSQL backed &bull; Instant full-text search
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-neutral-400">
                    <span className="text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">
                      Open
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-700 transition-colors" />
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
