import React from 'react';
import { Trash2, RotateCcw, X, AlertTriangle } from 'lucide-react';
import { useUIStore } from '~/store/uiStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTrashPages, restorePage, permanentDeletePage, emptyTrashPages } from '~/server/pages';
import { restoreClientPage, permanentlyDeleteClientPage, emptyClientTrash } from '~/lib/pageMetaSync';

interface TrashModalProps {
  workspaceId: string;
  onRefreshTree: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({ workspaceId, onRefreshTree }) => {
  const { isTrashOpen, setTrashOpen } = useUIStore();
  const queryClient = useQueryClient();

  const { data: trashPages = [], refetch } = useQuery({
    queryKey: ['trashPages', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return await getTrashPages({ data: workspaceId });
    },
    enabled: isTrashOpen && !!workspaceId,
  });

  const invalidateAll = () => {
    refetch();
    onRefreshTree();
    queryClient.invalidateQueries({ queryKey: ['pageTree'] });
    queryClient.invalidateQueries({ queryKey: ['page'] });
  };

  const handleRestore = async (pageId: string) => {
    restoreClientPage(queryClient, pageId);
    await restorePage({ data: pageId });
    invalidateAll();
  };

  const handlePermanentDelete = async (pageId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this page? This action cannot be undone.')) {
      permanentlyDeleteClientPage(queryClient, pageId);
      await permanentDeletePage({ data: pageId });
      invalidateAll();
    }
  };

  const handleRestoreAll = async () => {
    for (const page of trashPages) {
      restoreClientPage(queryClient, page.id);
    }
    for (const page of trashPages) {
      await restorePage({ data: page.id });
    }
    invalidateAll();
  };

  const handleEmptyTrash = async () => {
    if (window.confirm('Are you sure you want to permanently delete ALL items in Trash? This action cannot be undone.')) {
      emptyClientTrash(queryClient);
      await emptyTrashPages({ data: workspaceId });
      invalidateAll();
    }
  };

  if (!isTrashOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-xs animate-in fade-in duration-100 font-sans select-none">
      <div className="fixed inset-0" onClick={() => setTrashOpen(false)} />

      <div className="relative z-10 w-full max-w-lg bg-[#fdfcf9] border border-stone-200/90 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200/60 bg-[#f8f7f4]/70">
          <div className="flex items-center gap-2 text-stone-800">
            <Trash2 className="w-4 h-4 text-stone-500" />
            <h3 className="font-semibold text-sm text-stone-900">Trash ({trashPages.length})</h3>
          </div>
          <div className="flex items-center gap-2">
            {trashPages.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleRestoreAll}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200/80 text-stone-700 font-medium transition-colors cursor-pointer border border-stone-200"
                >
                  <RotateCcw className="w-3 h-3 text-stone-500" />
                  <span>Restore all</span>
                </button>
                <button
                  type="button"
                  onClick={handleEmptyTrash}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium transition-colors cursor-pointer border border-rose-200/80"
                >
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  <span>Empty trash</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setTrashOpen(false)}
              className="text-stone-400 hover:text-stone-700 p-1 rounded hover:bg-stone-200/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="max-h-96 overflow-y-auto p-3">
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
                  className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-stone-200/80 hover:border-stone-300 transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg shrink-0">{page.icon || '📄'}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-xs text-stone-900 truncate">
                        {page.title || 'Untitled Document'}
                      </span>
                      {page.deletedAt && (
                        <span className="text-[10px] text-stone-400 font-mono">
                          Deleted {new Date(page.deletedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRestore(page.id)}
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 font-medium transition-colors cursor-pointer"
                      title="Restore page"
                    >
                      <RotateCcw className="w-3 h-3 text-stone-500" />
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePermanentDelete(page.id)}
                      className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
        <div className="px-5 py-2.5 border-t border-stone-200/60 bg-stone-50/60 text-xs text-stone-400 flex items-center justify-between font-mono">
          <span className="text-[11px]">Pages can be restored anytime</span>
          <button
            type="button"
            onClick={() => setTrashOpen(false)}
            className="px-3.5 py-1 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
