import { useRef } from 'react';
import { createRoute, useNavigate } from '@tanstack/react-router';
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

  const isCreatingFolderRef = useRef(false);
  const createFolderMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || isCreatingFolderRef.current) return null;
      isCreatingFolderRef.current = true;
      try {
        return await createPage({ data: { workspaceId: workspaceId!, title: 'New Collection', icon: '📁' } });
      } finally {
        isCreatingFolderRef.current = false;
      }
    },
    onSuccess: () => {
      refetch();
    },
    onError: () => {
      isCreatingFolderRef.current = false;
    },
  });

  const isCreatingDocRef = useRef(false);
  const createDocumentMutation = useMutation({
    mutationFn: async (parentId?: string) => {
      if (!workspaceId || isCreatingDocRef.current) return null;
      isCreatingDocRef.current = true;
      try {
        return await createPage({ data: { workspaceId: workspaceId!, parentId, title: 'Untitled Document' } });
      } finally {
        isCreatingDocRef.current = false;
      }
    },
    onSuccess: (newPage) => {
      refetch();
      if (newPage) {
        navigate({ to: '/dashboard/p/$pageId', params: { pageId: newPage.id } });
      }
    },
    onError: () => {
      isCreatingDocRef.current = false;
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
