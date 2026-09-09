import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowRight01Icon,
  ArrowDown01Icon,
  PlusSignIcon,
  Delete02Icon,
  Edit02Icon,
  MoreHorizontalIcon,
} from '@hugeicons/core-free-icons';
import type { PageTreeNode } from '~/server/pages';
import { useUIStore } from '~/store/uiStore';
import { clsx } from 'clsx';

interface PageTreeItemProps {
  node: PageTreeNode;
  depth?: number;
  onCreateChild: (parentId: string) => void;
  onSelectPage: (pageId: string) => void;
  onSoftDelete: (pageId: string) => void;
  onUpdateMeta: (pageId: string, title: string, icon?: string) => void;
}

export const PageTreeItem: React.FC<PageTreeItemProps> = ({
  node,
  depth = 0,
  onCreateChild,
  onSelectPage,
  onSoftDelete,
  onUpdateMeta,
}) => {
  const { expandedNodeIds, toggleNodeExpand, activePageId } = useUIStore();
  const isExpanded = !!expandedNodeIds[node.id];
  const isActive = activePageId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const [showMenu, setShowMenu] = useState(false);

  const handleTitleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (editTitle.trim() && editTitle !== node.title) {
      onUpdateMeta(node.id, editTitle.trim(), node.icon || undefined);
    }
    setIsEditing(false);
  };

  return (
    <div className="select-none text-xs">
      <div
        className={clsx(
          'group flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors duration-150 cursor-pointer my-0.5',
          isActive
            ? 'bg-neutral-100 text-neutral-900 font-semibold'
            : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
        )}
        style={{ paddingLeft: `${Math.max(6, depth * 14 + 6)}px` }}
        onClick={() => onSelectPage(node.id)}
      >
        {/* Left Side: Toggle Chevron + Icon + Title */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <button
            type="button"
            className={clsx(
              'p-0.5 rounded text-neutral-400 hover:text-neutral-800 transition-transform',
              !hasChildren && 'opacity-0 pointer-events-none'
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleNodeExpand(node.id);
            }}
          >
            {isExpanded ? (
              <HugeiconsIcon icon={ArrowDown01Icon} size={13} />
            ) : (
              <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
            )}
          </button>

          <span className="text-sm leading-none shrink-0">
            {node.icon || '📄'}
          </span>

          {isEditing ? (
            <form onSubmit={handleTitleSubmit} className="flex-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => handleTitleSubmit()}
                autoFocus
                className="w-full bg-white text-neutral-900 text-xs px-1.5 py-0.5 rounded border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-black"
              />
            </form>
          ) : (
            <span className="truncate flex-1 font-medium">
              {node.title || 'Untitled'}
            </span>
          )}
        </div>

        {/* Right Side: Hover Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Add Sub-Page */}
          <button
            type="button"
            title="Add sub-page"
            className="p-1 rounded text-neutral-400 hover:text-neutral-800 hover:bg-neutral-200/60"
            onClick={(e) => {
              e.stopPropagation();
              onCreateChild(node.id);
            }}
          >
            <HugeiconsIcon icon={PlusSignIcon} size={13} />
          </button>

          {/* Context Options */}
          <div className="relative">
            <button
              type="button"
              title="More options"
              className="p-1 rounded text-neutral-400 hover:text-neutral-800 hover:bg-neutral-200/60"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} size={13} />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 top-6 w-36 bg-white border border-neutral-200 rounded-lg shadow-xl py-1 z-50 text-xs">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 flex items-center gap-2 text-neutral-700 font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      setIsEditing(true);
                    }}
                  >
                    <HugeiconsIcon icon={Edit02Icon} size={14} className="text-neutral-500" />
                    Rename
                  </button>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 flex items-center gap-2 text-rose-600 font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onSoftDelete(node.id);
                    }}
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={14} className="text-rose-500" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Render Child Tree Nodes if Expanded */}
      {isExpanded && hasChildren && (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <PageTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              onCreateChild={onCreateChild}
              onSelectPage={onSelectPage}
              onSoftDelete={onSoftDelete}
              onUpdateMeta={onUpdateMeta}
            />
          ))}
        </div>
      )}
    </div>
  );
};
