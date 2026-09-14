import React, { useState } from 'react';
import {
  FileText,
  Search,
  Plus,
  ChevronRight,
  ChevronDown,
  Star,
  Share2,
  MoreHorizontal,
  CheckSquare,
  Square,
  Sparkles,
  Code2,
  Home,
  Settings,
  GripVertical,
  Clock,
  Folder,
} from 'lucide-react';

export const DashboardMockup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('roadmap');
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({
    task1: true,
    task2: true,
    task3: false,
    task4: false,
  });
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);

  const toggleTask = (id: string) => {
    setCheckedTasks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="w-full h-full bg-white text-neutral-900 font-sans antialiased flex overflow-hidden select-none text-xs md:text-sm">
      {/* 1. Left Sidebar (Fixed theme styling - isolated from global theme toggles) */}
      <aside className="w-56 md:w-64 bg-[#f8fafc] border-r border-neutral-200/80 flex flex-col flex-shrink-0">
        {/* Workspace Selector */}
        <div className="p-3 border-b border-neutral-200/60 flex items-center justify-between hover:bg-neutral-200/50 transition-colors cursor-pointer group">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-6 h-6 rounded-md bg-neutral-900 text-white flex items-center justify-center font-semibold text-xs flex-shrink-0 shadow-2xs">
              N
            </div>
            <span className="font-semibold text-neutral-900 truncate">Notling HQ</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-700 transition-colors flex-shrink-0" />
        </div>

        {/* Quick Actions & Search */}
        <div className="p-2.5 flex flex-col gap-1 border-b border-neutral-200/60">
          <button
            type="button"
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900 transition-colors w-full text-left"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-neutral-500" />
              <span>Search notes</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400 bg-neutral-200/70 px-1.5 py-0.5 rounded">⌘K</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#1f4d3d] bg-[#1f4d3d]/10 hover:bg-[#1f4d3d]/20 font-medium transition-colors w-full text-left"
          >
            <Plus className="w-3.5 h-3.5 text-[#1f4d3d]" />
            <span>New Document</span>
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 no-scrollbar">
          {/* Main Section */}
          <div className="space-y-0.5">
            <button
              type="button"
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-neutral-600 hover:bg-neutral-200/50 hover:text-neutral-900 transition-colors"
            >
              <Home className="w-3.5 h-3.5 text-neutral-400" />
              <span>Home</span>
            </button>
            <button
              type="button"
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-neutral-600 hover:bg-neutral-200/50 hover:text-neutral-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Folder className="w-3.5 h-3.5 text-neutral-400" />
                <span>Folders</span>
              </div>
              <span className="text-[10px] bg-neutral-200 font-medium text-neutral-600 px-1.5 py-0.2 rounded-full">3</span>
            </button>
          </div>

          {/* Workspace Pages Tree */}
          <div>
            <div className="px-2.5 py-1 text-[11px] font-semibold text-neutral-400 tracking-wider uppercase flex items-center justify-between">
              <span>Workspace Pages</span>
              <Plus className="w-3 h-3 text-neutral-400 hover:text-neutral-700 cursor-pointer" />
            </div>

            <div className="mt-1 space-y-0.5">
              <div
                onClick={() => setActiveTab('roadmap')}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'roadmap'
                    ? 'bg-neutral-200/80 font-medium text-neutral-900'
                    : 'text-neutral-600 hover:bg-neutral-200/50 hover:text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <ChevronDown className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                  <span className="text-base leading-none">🚀</span>
                  <span className="truncate">Product Specs</span>
                </div>
                <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-neutral-700 transition-opacity" />
              </div>

              {/* Nested Sub-pages */}
              <div className="pl-6 space-y-0.5 border-l-2 border-neutral-200 ml-3">
                <div className="flex items-center gap-2 px-2 py-1 rounded text-neutral-900 font-medium bg-neutral-200/60 cursor-pointer">
                  <FileText className="w-3.5 h-3.5 text-[#1f4d3d] flex-shrink-0" />
                  <span className="truncate">Q3 Roadmap & Strategy</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/40 cursor-pointer">
                  <FileText className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                  <span className="truncate">Architecture Specs</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/40 cursor-pointer">
                  <FileText className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                  <span className="truncate">Design System v2</span>
                </div>
              </div>

              <div className="group flex items-center justify-between px-2.5 py-1.5 rounded-md text-neutral-600 hover:bg-neutral-200/50 hover:text-neutral-900 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 truncate">
                  <ChevronRight className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                  <span className="text-base leading-none">✨</span>
                  <span className="truncate">Engineering Guide</span>
                </div>
              </div>

              <div className="group flex items-center justify-between px-2.5 py-1.5 rounded-md text-neutral-600 hover:bg-neutral-200/50 hover:text-neutral-900 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 truncate">
                  <ChevronRight className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                  <span className="text-base leading-none">💡</span>
                  <span className="truncate">Meeting Notes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Footer in Sidebar */}
        <div className="p-3 border-t border-neutral-200/60 flex items-center justify-between bg-white/50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-medium text-[11px] shadow-2xs">
              AL
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-neutral-800 text-xs leading-tight">Alex Miller</span>
              <span className="text-[10px] text-neutral-400 leading-tight">Product Lead</span>
            </div>
          </div>
          <Settings className="w-3.5 h-3.5 text-neutral-400 hover:text-neutral-700 cursor-pointer transition-colors" />
        </div>
      </aside>

      {/* 2. Main Page View Area */}
      <main className="flex-1 flex flex-col h-full bg-white overflow-hidden">
        {/* Top Page Breadcrumbs & Actions Header */}
        <header className="h-12 border-b border-neutral-200/70 px-4 flex items-center justify-between gap-4 bg-white/80 backdrop-blur-xs flex-shrink-0">
          {/* Breadcrumb Trail */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 overflow-hidden">
            <span className="hover:text-neutral-800 cursor-pointer transition-colors flex items-center gap-1">
              <span>🚀</span> Product Specs
            </span>
            <span>/</span>
            <span className="font-medium text-neutral-900 truncate">Q3 Roadmap & Strategy</span>
          </div>

          {/* Top Actions & Collaborator Avatars */}
          <div className="flex items-center gap-3">
            {/* Collaborator Avatars */}
            <div className="flex items-center -space-x-1.5">
              <div
                className="w-6 h-6 rounded-full bg-indigo-500 border-2 border-white text-white flex items-center justify-center font-medium text-[10px] shadow-2xs"
                title="Sarah C. (editing)"
              >
                SC
              </div>
              <div
                className="w-6 h-6 rounded-full bg-amber-500 border-2 border-white text-white flex items-center justify-center font-medium text-[10px] shadow-2xs"
                title="Marcus T."
              >
                MT
              </div>
              <div className="w-6 h-6 rounded-full bg-neutral-200 border-2 border-white text-neutral-600 flex items-center justify-center font-medium text-[9px]">
                +2
              </div>
            </div>

            <div className="h-4 w-px bg-neutral-200" />

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition-colors"
                title="Bookmark"
              >
                <Star className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="px-2.5 py-1 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Share2 className="w-3 h-3" />
                <span>Share</span>
              </button>
              <button
                type="button"
                className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition-colors"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content Canvas (Scrollable Document View) */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8 max-w-4xl mx-auto w-full space-y-6 no-scrollbar">
          {/* Document Header */}
          <div className="space-y-3 pb-2 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <span className="text-3xl sm:text-4xl">🚀</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                Live Document
              </span>
              <span className="text-xs text-neutral-400 ml-auto flex items-center gap-1">
                <Clock className="w-3 h-3" /> Updated 2m ago
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950">
              Q3 Product Roadmap & Strategy
            </h1>

            <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed max-w-2xl font-normal">
              High-impact initiatives for Notling core platform: real-time collaborative block editing, sub-50ms sync latency, and refined typography.
            </p>
          </div>

          {/* Block 1: Callout Banner */}
          <div
            onMouseEnter={() => setHoveredBlock('block1')}
            onMouseLeave={() => setHoveredBlock(null)}
            className={`group relative p-3.5 rounded-xl bg-[#1f4d3d]/10 border border-[#1f4d3d]/20 flex items-start gap-3 transition-all ${
              hoveredBlock === 'block1' ? 'shadow-xs border-[#1f4d3d]/40' : ''
            }`}
          >
            {/* Block Hover Drag Handle */}
            <div className="absolute -left-6 top-3.5 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-neutral-300 hover:text-neutral-500 cursor-grab transition-opacity">
              <GripVertical className="w-3.5 h-3.5" />
            </div>

            <Sparkles className="w-4 h-4 text-[#1f4d3d] flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-neutral-800 leading-relaxed">
              <span className="font-semibold text-neutral-950">Core Objective:</span> Build the fastest distraction-free workspace that turns fleeting thoughts into structured knowledge effortlessly.
            </div>
          </div>

          {/* Block 2: Heading & Paragraph */}
          <div
            onMouseEnter={() => setHoveredBlock('block2')}
            onMouseLeave={() => setHoveredBlock(null)}
            className="group relative space-y-2"
          >
            <div className="absolute -left-6 top-1 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-neutral-300 hover:text-neutral-500 cursor-grab transition-opacity">
              <GripVertical className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-neutral-900 tracking-tight flex items-center gap-2">
              <span>1. Technical Architecture & Priorities</span>
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              Our engineering focus centers around zero-latency local state mutation paired with optimistic WebSocket broadcast pipelines.
            </p>
          </div>

          {/* Block 3: Interactive Checklist */}
          <div
            onMouseEnter={() => setHoveredBlock('block3')}
            onMouseLeave={() => setHoveredBlock(null)}
            className="group relative space-y-2 bg-neutral-50/70 p-3.5 rounded-xl border border-neutral-200/70"
          >
            <div className="absolute -left-6 top-3.5 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-neutral-300 hover:text-neutral-500 cursor-grab transition-opacity">
              <GripVertical className="w-3.5 h-3.5" />
            </div>

            <div className="text-xs font-semibold text-neutral-700 tracking-wide uppercase mb-2">
              Key Deliverables & Action Items
            </div>

            <div className="space-y-2">
              <div
                onClick={() => toggleTask('task1')}
                className="flex items-center gap-2.5 text-xs sm:text-sm cursor-pointer group/item select-none"
              >
                {checkedTasks.task1 ? (
                  <CheckSquare className="w-4 h-4 text-[#1f4d3d] flex-shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-neutral-400 group-hover/item:text-neutral-600 flex-shrink-0" />
                )}
                <span className={checkedTasks.task1 ? 'line-through text-neutral-400' : 'text-neutral-800'}>
                  Implement real-time block-level CRDT conflict resolution
                </span>
              </div>

              <div
                onClick={() => toggleTask('task2')}
                className="flex items-center gap-2.5 text-xs sm:text-sm cursor-pointer group/item select-none"
              >
                {checkedTasks.task2 ? (
                  <CheckSquare className="w-4 h-4 text-[#1f4d3d] flex-shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-neutral-400 group-hover/item:text-neutral-600 flex-shrink-0" />
                )}
                <span className={checkedTasks.task2 ? 'line-through text-neutral-400' : 'text-neutral-800'}>
                  Build frosted glass UI components & dynamic mesh gradient
                </span>
              </div>

              <div
                onClick={() => toggleTask('task3')}
                className="flex items-center gap-2.5 text-xs sm:text-sm cursor-pointer group/item select-none"
              >
                {checkedTasks.task3 ? (
                  <CheckSquare className="w-4 h-4 text-[#1f4d3d] flex-shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-neutral-400 group-hover/item:text-neutral-600 flex-shrink-0" />
                )}
                <span className={checkedTasks.task3 ? 'line-through text-neutral-400' : 'text-neutral-800 font-medium'}>
                  Finalize end-to-end encryption key rotation policy
                </span>
              </div>

              <div
                onClick={() => toggleTask('task4')}
                className="flex items-center gap-2.5 text-xs sm:text-sm cursor-pointer group/item select-none"
              >
                {checkedTasks.task4 ? (
                  <CheckSquare className="w-4 h-4 text-[#1f4d3d] flex-shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-neutral-400 group-hover/item:text-neutral-600 flex-shrink-0" />
                )}
                <span className={checkedTasks.task4 ? 'line-through text-neutral-400' : 'text-neutral-800'}>
                  Conduct global multi-region latency benchmarks
                </span>
              </div>
            </div>
          </div>

          {/* Block 4: Code Block Preview (Scrapped light variant; kept dark variant) */}
          <div
            onMouseEnter={() => setHoveredBlock('block4')}
            onMouseLeave={() => setHoveredBlock(null)}
            className="group relative rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-200 overflow-hidden text-xs shadow-md"
          >
            <div className="absolute -left-6 top-3 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-neutral-300 hover:text-neutral-500 cursor-grab transition-opacity">
              <GripVertical className="w-3.5 h-3.5" />
            </div>

            <div className="px-3.5 py-2 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between text-neutral-400 font-mono text-[11px]">
              <div className="flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 text-[#1f4d3d]" />
                <span>sync-pipeline.ts</span>
              </div>
              <span className="text-[10px] text-neutral-500 uppercase">TypeScript</span>
            </div>

            <pre className="p-3.5 font-mono overflow-x-auto leading-relaxed text-[11px] sm:text-xs text-emerald-300">
              <code>{`// Instant document synchronization pipeline
export async function syncDocument(pageId: string, delta: BlockDelta) {
  const session = await getSession();
  await db.page.update({
    where: { id: pageId },
    data: { content: delta, lastEditedAt: new Date() }
  });
  broadcastToCollaborators(pageId, delta);
}`}</code>
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardMockup;
