import { useEffect } from 'react';
import { createRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPage } from '~/server/pages';
import { Editor } from '~/components/Editor';
import { useUIStore } from '~/store/uiStore';
import { Route as dashboardRoute } from './dashboard';

export const Route = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/p/$pageId',
  component: DocumentPageRoute,
});

// export const Route = createFileRoute('/dashboard/p/$pageId')({
//   component: DocumentPageRoute,
// });

function DocumentPageRoute() {
  const { pageId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: page, isLoading } = useQuery({
    queryKey: ['page', pageId],
    queryFn: async () => {
      if (!pageId) return null;
      return await getPage({ data: pageId });
    },
    enabled: !!pageId,
    staleTime: 1000,
    refetchInterval: 1500,
  });

  // Synchronize Tab title, icon, and document title as soon as page data is loaded
  useEffect(() => {
    if (page?.id) {
      const { openTabs, updateTabMeta, openTab } = useUIStore.getState();
      const existing = openTabs.find((t) => t.id === page.id);
      const title = page.title || 'Untitled Document';
      const icon = page.icon || '📄';

      if (existing) {
        updateTabMeta(page.id, title, icon);
      } else {
        openTab({
          id: page.id,
          title,
          icon,
          path: `/dashboard/p/${page.id}`,
        });
      }

      document.title = `${title} — Notling`;
    }
  }, [page?.id, page?.title, page?.icon]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-neutral-400 bg-white">
        Loading document...
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-500 bg-white gap-3">
        <span className="text-sm font-medium">Document not found or access revoked</span>
        <button
          type="button"
          onClick={() => navigate({ to: '/dashboard/folders' })}
          className="px-3.5 py-2 rounded-lg bg-black text-white text-xs font-medium cursor-pointer"
        >
          Return to Folders
        </button>
      </div>
    );
  }

  return (
    <Editor
      key={page.id}
      page={page}
      onTitleOrIconChange={() => {
        queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      }}
      onBack={() => {
        navigate({ to: '/dashboard/folders' });
      }}
    />
  );
}
