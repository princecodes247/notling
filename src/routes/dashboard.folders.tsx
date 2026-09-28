import { useRef } from 'react';
import { createRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSession } from '~/server/auth';
import { getPageTree, createPage, togglePinPage, duplicatePage, softDeletePage } from '~/server/pages';
import { getDatabasesInWorkspace, createDatabase, deleteDatabase } from '~/server/databases';
import { deleteClientPage, deleteClientDatabase } from '~/lib/pageMetaSync';
import { FoldersView } from '~/components/dashboard/FoldersView';
import { Route as dashboardRoute } from './dashboard';

export const Route = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/folders',
  component: DashboardFoldersPage,
});

function DashboardFoldersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => await getSession(),
    staleTime: 5 * 60 * 1000,
  });

  const workspaceId = session?.workspaceId;

  const { data: treeNodes = [], refetch: refetchTree } = useQuery({
    queryKey: ['pageTree', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return await getPageTree({ data: workspaceId });
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });

  console.log({ treeNodes })

  const { data: databasesList = [], refetch: refetchDbs } = useQuery({
    queryKey: ['databasesList', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return await getDatabasesInWorkspace({ data: workspaceId });
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
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
      refetchTree();
      if (newPage) {
        navigate({ to: '/dashboard/p/$pageId', params: { pageId: newPage.id } });
      }
    },
    onError: () => {
      isCreatingDocRef.current = false;
    },
  });

  const isCreatingDbRef = useRef(false);
  const createDbMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || isCreatingDbRef.current) return null;
      isCreatingDbRef.current = true;
      try {
        return await createDatabase({ data: { workspaceId: workspaceId!, title: 'Untitled Database' } });
      } finally {
        isCreatingDbRef.current = false;
      }
    },
    onSuccess: (fullDb) => {
      refetchTree();
      refetchDbs();
      if (fullDb?.database?.id) {
        navigate({ to: '/dashboard/db/$databaseId', params: { databaseId: fullDb.database.id } });
      }
    },
    onError: () => {
      isCreatingDbRef.current = false;
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async (id: string) => {
      await togglePinPage({ data: { pageId: id } });
    },
    onSuccess: () => {
      refetchTree();
      refetchDbs();
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await duplicatePage({ data: id });
    },
    onSuccess: () => {
      refetchTree();
      refetchDbs();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: { id: string; databaseId?: string | null }) => {
      if (item.databaseId) {
        await deleteDatabase({ data: item.databaseId });
      }
      await softDeletePage({ data: item.id });
    },
    onMutate: (item) => {
      if (item.databaseId) {
        deleteClientDatabase(queryClient, item.databaseId, item.id);
      } else {
        deleteClientPage(queryClient, item.id);
      }
    },
    onSuccess: () => {
      refetchTree();
      refetchDbs();
    },
  });

  return (
    <FoldersView
      treeNodes={treeNodes}
      databasesList={databasesList}
      onSelectPage={(id) => navigate({ to: '/dashboard/p/$pageId', params: { pageId: id } })}
      onSelectDatabase={(dbId) => navigate({ to: '/dashboard/db/$databaseId', params: { databaseId: dbId } })}
      onCreateDocument={(folderId) => createDocumentMutation.mutate(folderId)}
      onCreateDatabase={() => createDbMutation.mutate()}
      onTogglePin={(id) => togglePinMutation.mutate(id)}
      onDuplicate={(id) => duplicateMutation.mutate(id)}
      onDelete={(item) => deleteMutation.mutate(item)}
    />
  );
}
