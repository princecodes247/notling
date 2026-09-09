import React from 'react';
import { Trash2, RotateCcw, X } from 'lucide-react';
import { useUIStore } from '~/store/uiStore';
import { useQuery } from '@tanstack/react-query';
import { getTrashPages, restorePage, permanentDeletePage } from '~/server/pages';

interface TrashModalProps {
  workspaceId: string;
  onRefreshTree: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({ workspaceId, onRefreshTree }) => {
  const { isTrashOpen, setTrashOpen } = useUIStore();

  const { data: trashPages = [], refetch } = useQuery({
    queryKey: ['trashPages', workspaceId],
    queryFn: async () => {
      return await getTrashPages({ data: workspaceId });
    },
    enabled: isTrashOpen,
  });

  const handleRestore = async (pageId: string) => {
    await restorePage({ data: pageId });
    refetch();
    onRefreshTree();
  };

  const handlePermanentDelete = async (pageId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this page? This action cannot be undone.')) {
      await permanentDeletePage({ data: pageId });
      refetch();
    }
  };

  if (!isTrashOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="fixed inset-0" onClick={() => setTrashOpen(false)} />

      <div className="relative z-10 w-full max-w-lg bg-white border border-neutral-200/90 rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2 text-neutral-800">
            <Trash2 className="w-4 h-4 text-neutral-500" />
            <h3 className="font-semibold text-sm text-neutral-900">Trash</h3>
          </div>
          <button
            type="button"
            onClick={() => setTrashOpen(false)}
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded hover:bg-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="max-h-96 overflow-y-auto p-4">
          {trashPages.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-xs flex flex-col items-center gap-2">
              <Trash2 className="w-7 h-7 text-neutral-300 stroke-1" />
              <span>Trash is empty. Deleted pages will appear here.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {trashPages.map((page: { id: string; title: string; icon?: string | null; deletedAt?: Date | null }) => (
                <div
                  key={page.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/60 hover:border-neutral-300 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg shrink-0">{page.icon || '📄'}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-xs text-neutral-800 truncate">
                        {page.title || 'Untitled'}
                      </span>
                      {page.deletedAt && (
                        <span className="text-[10px] text-neutral-400">
                          Deleted {new Date(page.deletedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRestore(page.id)}
                      className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 font-medium transition-colors"
                      title="Restore page"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePermanentDelete(page.id)}
                      className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50 text-xs text-neutral-400 flex items-center justify-between">
          <span className="text-[11px]">Pages can be restored anytime</span>
          <button
            type="button"
            onClick={() => setTrashOpen(false)}
            className="px-3 py-1 bg-black text-white hover:bg-neutral-800 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
