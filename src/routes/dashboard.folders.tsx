import { createFileRoute, createRoute, useNavigate } from '@tanstack/react-router';
import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getSession } from '~/server/auth';
import { getPageTree, createPage } from '~/server/pages';
import { FoldersView } from '~/components/dashboard/FoldersView';
import { Route as dashboardRoute } from './dashboard';

export const Route = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/folders',
  component: DashboardFoldersPage,
});

// export const Route = createFileRoute('/dashboard/folders')({
//   component: DashboardFoldersPage,
// });

function DashboardFoldersPage() {
  const navigate = useNavigate();

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => await getSession(),
  });

  const workspaceId = session?.workspaceId;

  const { data: treeNodes = [], refetch } = useQuery({
    queryKey: ['pageTree', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return await getPageTree({ data: workspaceId });
    },
    enabled: !!workspaceId,
  });

  const createFolderMutation = useMutation({
    mutationFn: async () => {
      return await createPage({ data: { workspaceId: workspaceId!, title: 'New Collection', icon: '📁' } });
    },
    onSuccess: () => {
      refetch();
    },
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (parentId?: string) => {
      return await createPage({ data: { workspaceId: workspaceId!, parentId, title: 'Untitled Document' } });
    },
    onSuccess: (newPage) => {
      refetch();
      if (newPage) {
        navigate({ to: '/dashboard/p/$pageId', params: { pageId: newPage.id } });
      }
    },
  });

  return (
    <FoldersView
      treeNodes={treeNodes}
      onSelectPage={(id) => navigate({ to: '/dashboard/p/$pageId', params: { pageId: id } })}
      onCreateFolder={() => createFolderMutation.mutate()}
      onCreateDocument={(folderId) => createDocumentMutation.mutate(folderId)}
    />
  );
}
