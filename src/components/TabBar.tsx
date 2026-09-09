import React from 'react';
import { X, Plus, Home, Folder, Settings, FileText } from 'lucide-react';
import type { TabItem } from '~/store/uiStore';

interface TabBarProps {
  tabs: TabItem[];
  activeTabId: string | null;
  onSelectTab: (tab: TabItem) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}) => {
  const isHomeActive = activeTabId === 'home' || (!activeTabId && tabs.length === 0);
  const fileTabs = tabs.filter((t) => t.id !== 'home');

  return (
    <div className="flex items-center gap-1.5 px-1 py-1 overflow-x-auto no-scrollbar shrink-0 select-none">
      {/* Pinned Compact Home Icon Button */}
      <button
        type="button"
        onClick={() =>
          onSelectTab({ id: 'home', title: 'Home', icon: '🏠', path: '/dashboard' })
        }
        className={`p-1.5 rounded-lg transition-all cursor-pointer border flex items-center justify-center ${
          isHomeActive
            ? 'bg-white border-neutral-200/90 text-neutral-900 shadow-2xs'
            : 'bg-transparent border-transparent text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/50'
        }`}
        title="Home"
      >
        <Home className="w-3.5 h-3.5 stroke-[1.8]" />
      </button>

      {/* Open File / Folder Tabs */}
      {fileTabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab)}
            className={`group relative flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer border ${
              isActive
                ? 'bg-white border-neutral-200/90 text-neutral-900 font-medium shadow-2xs'
                : 'bg-transparent border-transparent text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/50'
            }`}
          >
            {/* Tab Icon */}
            {tab.icon ? (
              <span className="text-xs shrink-0">{tab.icon}</span>
            ) : tab.id === 'folders' ? (
              <Folder className="w-3.5 h-3.5 text-neutral-400 shrink-0 stroke-[1.75]" />
            ) : tab.id === 'settings' ? (
              <Settings className="w-3.5 h-3.5 text-neutral-400 shrink-0 stroke-[1.75]" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0 stroke-[1.75]" />
            )}

            {/* Tab Title */}
            <span className="max-w-[140px] truncate leading-none">
              {tab.title || 'Untitled'}
            </span>

            {/* Close Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              className={`p-0.5 rounded hover:bg-neutral-200/70 text-neutral-400 hover:text-neutral-700 transition-opacity ${
                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              title="Close tab"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      {/* New Tab (+) Button */}
      <button
        type="button"
        onClick={onNewTab}
        className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
        title="New document tab"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
