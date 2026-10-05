import { createFileRoute, Outlet, useNavigate, useLocation, redirect } from '@tanstack/react-router';
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from '~/components/Sidebar';
import { TabBar } from '~/components/TabBar';
import { CommandPalette } from '~/components/CommandPalette';
import { CreateWorkspaceModal } from '~/components/CreateWorkspaceModal';
import { ImportModal } from '~/components/ImportModal';
import { MobileHeader } from '~/components/dashboard/MobileHeader';
import { getSession, signOut, getUserWorkspaces, switchWorkspace, createWorkspace, getSidebarPreference } from '~/server/auth';
import { getPageTree, getPage, createPage, softDeletePage, updatePageMeta, reorderPage, togglePinPage, duplicatePage, type PageTreeNode } from '~/server/pages';
import { createDatabase } from '~/server/databases';
import { updateClientPageMeta, updateClientPagePin, deleteClientPage, deleteClientDatabase, createClientSubPage, duplicateClientPage, reorderClientPageTree } from '~/lib/pageMetaSync';
import { useUIStore, type TabItem } from '~/store/uiStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NetworkStatusBanner } from '~/components/NetworkStatusBanner';

export const Route = createFileRoute('/dashboard')({
  loader: async () => {
    try {
      const session = await getSession();
      if (!session) {
        throw redirect({ to: '/login' });
      }
      if (!session.isOnboarded) {
        throw redirect({ to: '/onboarding' });
      }

      const [userWorkspaces, treeNodes, sidebarOpenPref] = await Promise.all([
        getUserWorkspaces().catch(() => []),
        session.workspaceId ? getPageTree({ data: session.workspaceId }).catch(() => []) : Promise.resolve([]),
        getSidebarPreference().catch(() => true),
      ]);

      return { session, userWorkspaces, treeNodes, sidebarOpen: sidebarOpenPref };
    } catch (err: any) {
      if (err?.to) throw err;
      return { session: null, userWorkspaces: [], treeNodes: [], sidebarOpen: true };
    }
  },
  component: DashboardLayout,
});

function findNodeInTree(nodes: PageTreeNode[], id: string): PageTreeNode | null {
  for (const node of nodes) {
    if (node.id === id || (node as any).databaseId === id) return node;
    if (node.children?.length) {
      const found = findNodeInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function DashboardLayout() {
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const {
    sidebarOpen,
    mobileSidebarOpen,
    openTabs,
    activeTabId,
    closeTab,
    setActiveTabId,
  } = useUIStore();

  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = React.useState(false);
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = React.useState<string | null>(null);

  const isDesktopSidebarOpen = typeof window === 'undefined' ? (loaderData?.sidebarOpen ?? true) : sidebarOpen;

  const closeSidebarOnMobile = React.useCallback(() => {
    useUIStore.getState().setMobileSidebarOpen(false);
  }, []);

  // 1. Fetch Session
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        return await getSession();
      } catch (err) {
        return null;
      }
    },
    initialData: loaderData?.session ?? undefined,
    staleTime: 5 * 60 * 1000,
  });

  // Redirect if unauthenticated or incomplete onboarding
  React.useEffect(() => {
    if (!sessionLoading) {
      if (!session) {
        navigate({ to: '/login' });
      } else if (!session.isOnboarded) {
        navigate({ to: '/onboarding' });
      }
    }
  }, [session, sessionLoading]);

  const workspaceId = session?.workspaceId;

  // 1b. Fetch User Workspaces
  const { data: userWorkspaces = [] } = useQuery({
    queryKey: ['userWorkspaces'],
    queryFn: async () => {
      return await getUserWorkspaces();
    },
    enabled: !!session,
    initialData: loaderData?.userWorkspaces ?? [],
    staleTime: 5 * 60 * 1000,
  });

  // Switch Workspace Mutation
  const switchWorkspaceMutation = useMutation({
    mutationFn: async (targetWorkspaceId: string) => {
      return await switchWorkspace({ data: { workspaceId: targetWorkspaceId } });
    },
    onMutate: async (targetWorkspaceId: string) => {
      setSwitchingWorkspaceId(targetWorkspaceId);
      const targetWs = userWorkspaces.find((w) => w.id === targetWorkspaceId);
      if (targetWs) {
        queryClient.setQueryData(['session'], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            workspaceId: targetWs.id,
            workspaceName: targetWs.name,
            workspaceSlug: targetWs.slug,
            workspaceIcon: targetWs.icon,
            role: targetWs.role,
          };
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      queryClient.invalidateQueries({ queryKey: ['userWorkspaces'] });
      queryClient.invalidateQueries({ queryKey: ['trashPages'] });
    },
    onSettled: () => {
      setSwitchingWorkspaceId(null);
    },
  });

  // Create Workspace Mutation
  const createWorkspaceMutation = useMutation({
    mutationFn: async ({ name, icon, description }: { name: string; icon?: string; description?: string }) => {
      return await createWorkspace({ data: { name, icon, description } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      queryClient.invalidateQueries({ queryKey: ['userWorkspaces'] });
      setIsCreateWorkspaceOpen(false);
    },
  });

  // 2. Fetch Workspace Page Tree
  const { data: treeNodes = [], refetch: refetchTree, isLoading: treeLoading } = useQuery({
    queryKey: ['pageTree', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return await getPageTree({ data: workspaceId });
    },
    enabled: !!workspaceId,
    initialData: loaderData?.treeNodes ?? [],
    staleTime: 5 * 60 * 1000,
  });

  // Determine current active nav based on pathname
  const currentPath = location.pathname;
  let activeNav: string = 'home';
  if (currentPath.includes('/dashboard/folders')) {
    activeNav = 'folders';
  } else if (currentPath.includes('/dashboard/settings')) {
    activeNav = 'settings';
  } else if (currentPath.includes('/dashboard/profile')) {
    activeNav = 'profile';
  } else if (currentPath.includes('/dashboard/trash')) {
    activeNav = 'trash';
  } else if (currentPath.includes('/dashboard/p/')) {
    activeNav = 'document';
  } else if (currentPath === '/dashboard') {
    activeNav = 'home';
  }

  // Synchronize URL pathname with Open Tabs
  React.useEffect(() => {
    const { openTab: doOpenTab, setActivePageId: doSetActivePageId } = useUIStore.getState();
    if (currentPath.includes('/dashboard/p/')) {
      const match = currentPath.match(/\/dashboard\/p\/([^/]+)/);
      if (match && match[1]) {
        const pageId = match[1];
        doSetActivePageId(pageId);
        const node = findNodeInTree(treeNodes, pageId);
        const existingTab = useUIStore.getState().openTabs.find((t) => t.id === pageId);
        const liveMeta = useUIStore.getState().pageMeta[pageId];
        const resolvedTitle =
          liveMeta?.title ??
          node?.title ??
          (existingTab?.title && existingTab.title !== 'Untitled Document' ? existingTab.title : 'Untitled Document');
        const resolvedIcon = liveMeta?.icon ?? node?.icon ?? existingTab?.icon ?? '';

        doOpenTab({
          id: pageId,
          title: resolvedTitle,
          icon: resolvedIcon,
          path: currentPath,
        });

        if (resolvedTitle && resolvedTitle !== 'Untitled Document') {
          document.title = `${resolvedTitle} - Notling`;
        }
      }
    } else if (currentPath.includes('/dashboard/db/')) {
      const match = currentPath.match(/\/dashboard\/db\/([^/]+)/);
      if (match && match[1]) {
        const dbId = match[1];
        doSetActivePageId(dbId);
        const node = findNodeInTree(treeNodes, dbId);
        const existingTab = useUIStore.getState().openTabs.find((t) => t.id === dbId);
        const liveMeta = useUIStore.getState().pageMeta[dbId];
        const resolvedTitle =
          liveMeta?.title ??
          node?.title ??
          (existingTab?.title && existingTab.title !== 'Untitled Database' && existingTab.title !== 'Untitled Document'
            ? existingTab.title
            : (node?.title || 'Untitled Database'));
        const resolvedIcon = liveMeta?.icon ?? node?.icon ?? existingTab?.icon ?? null;

        doOpenTab({
          id: dbId,
          title: resolvedTitle,
          icon: resolvedIcon,
          path: currentPath,
        });

        if (resolvedTitle) {
          document.title = `${resolvedTitle} — Notling`;
        }
      }
    } else if (currentPath.includes('/dashboard/folders')) {
      doSetActivePageId(null);
      document.title = 'All Pages - Notling';
      doOpenTab({
        id: 'folders',
        title: 'All Pages',
        path: '/dashboard/folders',
      });
    } else if (currentPath.includes('/dashboard/settings')) {
      doSetActivePageId(null);
      document.title = 'Workspace Settings - Notling';
      doOpenTab({
        id: 'settings',
        title: 'Workspace Settings',
        path: '/dashboard/settings',
      });
    } else if (currentPath.includes('/dashboard/profile')) {
      doSetActivePageId(null);
      document.title = 'Profile Settings - Notling';
      doOpenTab({
        id: 'profile',
        title: 'Profile Settings',
        path: '/dashboard/profile',
      });
    } else if (currentPath.includes('/dashboard/trash')) {
      doSetActivePageId(null);
      document.title = 'Trash - Notling';
      doOpenTab({
        id: 'trash',
        title: 'Trash',
        path: '/dashboard/trash',
      });
    } else if (currentPath === '/dashboard') {

      if (session?.welcomePageId) {
        const targetWelcomeId = session.welcomePageId;
        queryClient.setQueryData(['session'], (oldData: any) =>
          oldData ? { ...oldData, welcomePageId: undefined } : oldData
        );
        navigate({ to: '/dashboard/p/$pageId', params: { pageId: targetWelcomeId }, replace: true });
      } else {
        doSetActivePageId(null);
        document.title = 'Home - Notling';
        doOpenTab({
          id: 'home',
          title: 'Home',
          icon: '🏠',
          path: '/dashboard',
        });
      }
    }
  }, [currentPath, treeNodes]);

  // Background pre-fetch open document tabs into query cache for instant 0ms tab switching
  React.useEffect(() => {
    openTabs.forEach((t) => {
      if (
        t.id &&
        t.id !== 'home' &&
        t.id !== 'folders' &&
        t.id !== 'settings' &&
        t.id !== 'profile' &&
        t.id !== 'trash'
      ) {
        queryClient.prefetchQuery({
          queryKey: ['page', t.id],
          queryFn: async () => await getPage({ data: t.id }),
          staleTime: 5 * 60 * 1000,
        });
      }
    });
  }, [openTabs, queryClient]);

  const isCreatingPageRef = React.useRef(false);

  // Create Page Mutation
  const createPageMutation = useMutation({
    mutationFn: async (parentId?: string) => {
      if (!workspaceId || isCreatingPageRef.current) return null;
      isCreatingPageRef.current = true;
      try {
        return await createPage({ data: { workspaceId, parentId, title: 'Untitled Document' } });
      } finally {
        isCreatingPageRef.current = false;
      }
    },
    onMutate: async (parentId?: string) => {
      const { tempId, previousTree } = createClientSubPage(queryClient, {
        workspaceId,
        parentId,
        title: 'Untitled Document',
      });
      return { tempId, previousTree };
    },
    onError: (_err, _vars, context) => {
      isCreatingPageRef.current = false;
      if (context?.previousTree) {
        queryClient.setQueriesData({ queryKey: ['pageTree'] }, () => context.previousTree);
      }
    },
    onSuccess: (newPage) => {
      refetchTree();
      if (newPage) {
        useUIStore.getState().setActivePageId(newPage.id);
        navigate({ to: '/dashboard/p/$pageId', params: { pageId: newPage.id } });
      }
    },
  });

  // Create Database Mutation
  const createDatabaseMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) return null;
      return await createDatabase({ data: { workspaceId, title: 'Untitled Database' } });
    },
    onSuccess: (newDb) => {
      if (newDb) {
        queryClient.invalidateQueries({ queryKey: ['databases'] });
        queryClient.invalidateQueries({ queryKey: ['pageTree'] });
        refetchTree();
        navigate({ to: '/dashboard/db/$databaseId', params: { databaseId: newDb.database.id } });
        closeSidebarOnMobile();
      }
    },
  });

  // Fetch Trash Pages
  const { data: trashPages = [] } = useQuery({
    queryKey: ['trashPages', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { getTrashPages } = await import('~/server/pages');
      return await getTrashPages({ data: workspaceId });
    },
    enabled: !!workspaceId,
  });

  // Fetch Databases in Workspace
  const { data: databases = [] } = useQuery({
    queryKey: ['databases', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { getDatabasesInWorkspace } = await import('~/server/databases');
      return await getDatabasesInWorkspace({ data: workspaceId });
    },
    enabled: !!workspaceId,
  });

  // Soft Delete Page Mutation
  const softDeleteMutation = useMutation({
    mutationFn: async (pageId: string) => {
      return await softDeletePage({ data: pageId });
    },
    onMutate: async (pageId: string) => {
      const dbMatch = databases.find((db: any) => db.pageId === pageId || db.id === pageId);
      let nextPath: string | null = null;
      if (dbMatch) {
        nextPath = deleteClientDatabase(queryClient, dbMatch.id, pageId);
      } else {
        nextPath = deleteClientPage(queryClient, pageId);
      }

      if (nextPath) {
        navigate({ to: nextPath as any });
      } else {
        const currentActiveTab = useUIStore.getState().activeTabId;
        if (!currentActiveTab || currentActiveTab === pageId || (dbMatch && currentActiveTab === dbMatch.id)) {
          navigate({ to: '/dashboard/folders' });
        }
      }
    },
    onSuccess: () => {
      refetchTree();
      queryClient.invalidateQueries({ queryKey: ['trashPages'] });
      queryClient.invalidateQueries({ queryKey: ['databasesList'] });
    },
  });

  // Update Page Meta Mutation
  const updateMetaMutation = useMutation({
    mutationFn: async ({ pageId, title, icon }: { pageId: string; title: string; icon?: string | null }) => {
      return await updatePageMeta({ data: { pageId, title, icon } });
    },
    onMutate: async ({ pageId, title, icon }) => {
      updateClientPageMeta(queryClient, { pageId, title, icon });
    },
    onSuccess: () => {
      refetchTree();
      queryClient.invalidateQueries({ queryKey: ['page'] });
      queryClient.invalidateQueries({ queryKey: ['database'] });
      queryClient.invalidateQueries({ queryKey: ['databases'] });
      queryClient.invalidateQueries({ queryKey: ['databasesList'] });
    },
  });

  // Reorder Page Mutation
  const reorderPageMutation = useMutation({
    mutationFn: async (input: { pageId: string; targetParentId: string | null; targetOrder: number }) => {
      return await reorderPage({ data: input });
    },
    onMutate: async (input) => {
      const { previousTree } = reorderClientPageTree(queryClient, {
        pageId: input.pageId,
        targetParentId: input.targetParentId,
        targetOrder: input.targetOrder,
        workspaceId,
      });
      return { previousTree };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTree) {
        queryClient.setQueriesData({ queryKey: ['pageTree'] }, () => context.previousTree);
      }
    },
    onSuccess: () => {
      refetchTree();
    },
  });

  // Toggle Pin / Favorite Mutation
  const togglePinMutation = useMutation({
    mutationFn: async (pageId: string) => {
      return await togglePinPage({ data: { pageId } });
    },
    onMutate: async (pageId: string) => {
      let currentPinned = false;
      const pageTree = queryClient.getQueryData<PageTreeNode[]>(['pageTree']);
      const findNode = (nodes: PageTreeNode[]): PageTreeNode | null => {
        for (const n of nodes) {
          if (n.id === pageId || n.databaseId === pageId) return n;
          if (n.children && n.children.length > 0) {
            const found = findNode(n.children);
            if (found) return found;
          }
        }
        return null;
      };
      if (pageTree && Array.isArray(pageTree)) {
        const node = findNode(pageTree);
        if (node) currentPinned = !!node.isPinned;
      }
      const nextPinned = !currentPinned;
      updateClientPagePin(queryClient, pageId, nextPinned);
      return { previousPinned: currentPinned, pageId };
    },
    onError: (_err, pageId, context) => {
      if (context) {
        updateClientPagePin(queryClient, pageId, context.previousPinned);
      }
    },
    onSuccess: () => {
      refetchTree();
      queryClient.invalidateQueries({ queryKey: ['page'] });
      queryClient.invalidateQueries({ queryKey: ['database'] });
      queryClient.invalidateQueries({ queryKey: ['databasesList'] });
    },
  });

  // Duplicate Page Mutation
  const duplicatePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      return await duplicatePage({ data: pageId });
    },
    onMutate: async (pageId: string) => {
      const { tempId, previousTree } = duplicateClientPage(queryClient, pageId, workspaceId);
      return { tempId, previousTree };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTree) {
        queryClient.setQueriesData({ queryKey: ['pageTree'] }, () => context.previousTree);
      }
    },
    onSuccess: (newPage) => {
      refetchTree();
      if (newPage) {
        useUIStore.getState().setActivePageId(newPage.id);
        navigate({ to: '/dashboard/p/$pageId', params: { pageId: newPage.id } });
      }
    },
  });

  const handleSelectTab = (tab: TabItem) => {
    setActiveTabId(tab.id);
    if (tab.id !== 'home' && tab.id !== 'folders' && tab.id !== 'settings' && tab.id !== 'profile' && tab.id !== 'trash') {
      useUIStore.getState().setActivePageId(tab.id);
    } else {
      useUIStore.getState().setActivePageId(null);
    }
    navigate({ to: tab.path as any });
  };

  const handleCloseTab = (tabId: string) => {
    const nextPath = closeTab(tabId);
    if (nextPath) {
      navigate({ to: nextPath as any });
    }
  };

  const handleLogout = async () => {
    await signOut();
    queryClient.invalidateQueries({ queryKey: ['session'] });
    navigate({ to: '/login' });
  };

  if (!session) {
    return null;
  }

  return (
    <>
      <NetworkStatusBanner />
      {/* <OnboardingBanner
        workspaceName={session.workspaceName}
        onOpenSettings={() => navigate({ to: '/dashboard/settings' })}
      /> */}

      <div className="h-screen w-screen max-w-full bg-[#f3f2ee] dark:bg-[#121214] p-0 flex select-none relative overflow-hidden">
        {/* Mobile Drawer Dark Backdrop Overlay */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <motion.div
              key="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSidebarOnMobile}
              className="fixed inset-0 bg-stone-950/45 backdrop-blur-xs z-40 md:hidden"
            />
          )}
        </AnimatePresence>

        {/* Mobile Responsive Sidebar Drawer (Small screens only) */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <motion.div
              key="mobile-sidebar-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.7 }}
              className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[280px] h-full overflow-hidden bg-[#f9f8f5] dark:bg-[#121214] shadow-2xl md:hidden flex flex-col"
            >
              <Sidebar
                databases={databases}
                onSelectDatabase={(dbId) => {
                  navigate({ to: '/dashboard/db/$databaseId', params: { databaseId: dbId } });
                  closeSidebarOnMobile();
                }}
                workspaceName={session.workspaceName || `${session.name || 'Personal'}'s Workspace`}
                session={session}
                treeNodes={treeNodes}
                userWorkspaces={userWorkspaces}
                isCreatingPage={createPageMutation.isPending}
                isLoading={treeLoading}
                switchingWorkspaceId={switchingWorkspaceId}
                isSwitchingWorkspace={switchWorkspaceMutation.isPending}
                onSwitchWorkspace={async (id) => {
                  await switchWorkspaceMutation.mutateAsync(id);
                  closeSidebarOnMobile();
                }}
                onOpenCreateWorkspaceModal={() => {
                  setIsCreateWorkspaceOpen(true);
                  closeSidebarOnMobile();
                }}
                trashCount={trashPages.length}
                activeNav={activeNav}
                onNavClick={(nav) => {
                  if (nav === 'home') navigate({ to: '/dashboard' });
                  else if (nav === 'folders') navigate({ to: '/dashboard/folders' });
                  else if (nav === 'settings') navigate({ to: '/dashboard/settings' });
                  else if (nav === 'profile') navigate({ to: '/dashboard/profile' });
                  else if (nav === 'trash') navigate({ to: '/dashboard/trash' });
                  closeSidebarOnMobile();
                }}
                onCreatePage={async (parentId) => {
                  if (createPageMutation.isPending) return;
                  const res = await createPageMutation.mutateAsync(parentId);
                  closeSidebarOnMobile();
                  return res;
                }}
                onCreateDatabase={() => {
                  if (createDatabaseMutation.isPending) return;
                  createDatabaseMutation.mutate();
                  closeSidebarOnMobile();
                }}
                onSelectPage={(id, dbId) => {
                  useUIStore.getState().setActivePageId(id);
                  if (dbId) {
                    navigate({ to: '/dashboard/db/$databaseId', params: { databaseId: dbId } });
                  } else {
                    navigate({ to: '/dashboard/p/$pageId', params: { pageId: id } });
                  }
                  closeSidebarOnMobile();
                }}
                onSoftDelete={(id) => softDeleteMutation.mutate(id)}
                onUpdateMeta={(id, title, icon) => {
                  updateClientPageMeta(queryClient, { pageId: id, title, icon });
                  updateMetaMutation.mutate({ pageId: id, title, icon });
                }}
                onReorderPage={(input) => reorderPageMutation.mutate(input)}
                onTogglePin={(id) => togglePinMutation.mutate(id)}
                onDuplicatePage={async (id) => {
                  return await duplicatePageMutation.mutateAsync(id);
                }}
                onLogout={handleLogout}
                onClose={closeSidebarOnMobile}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop Docked Sidebar (Hidden on mobile via CSS) */}
        <AnimatePresence initial={false}>
          {isDesktopSidebarOpen && (
            <motion.div
              key="desktop-sidebar-wrapper"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.7 }}
              className="hidden md:flex shrink-0 h-full overflow-hidden bg-[#f9f8f5] dark:bg-[#121214] relative z-20 w-[240px]"
            >
              <Sidebar
                databases={databases}
                onSelectDatabase={(dbId) => {
                  navigate({ to: '/dashboard/db/$databaseId', params: { databaseId: dbId } });
                }}
                workspaceName={session.workspaceName || `${session.name || 'Personal'}'s Workspace`}
                session={session}
                treeNodes={treeNodes}
                userWorkspaces={userWorkspaces}
                isCreatingPage={createPageMutation.isPending}
                isLoading={treeLoading}
                switchingWorkspaceId={switchingWorkspaceId}
                isSwitchingWorkspace={switchWorkspaceMutation.isPending}
                onSwitchWorkspace={async (id) => {
                  await switchWorkspaceMutation.mutateAsync(id);
                }}
                onOpenCreateWorkspaceModal={() => {
                  setIsCreateWorkspaceOpen(true);
                }}
                trashCount={trashPages.length}
                activeNav={activeNav}
                onNavClick={(nav) => {
                  if (nav === 'home') navigate({ to: '/dashboard' });
                  else if (nav === 'folders') navigate({ to: '/dashboard/folders' });
                  else if (nav === 'settings') navigate({ to: '/dashboard/settings' });
                  else if (nav === 'profile') navigate({ to: '/dashboard/profile' });
                  else if (nav === 'trash') navigate({ to: '/dashboard/trash' });
                }}
                onCreatePage={async (parentId) => {
                  if (createPageMutation.isPending) return;
                  return await createPageMutation.mutateAsync(parentId);
                }}
                onCreateDatabase={() => {
                  if (createDatabaseMutation.isPending) return;
                  createDatabaseMutation.mutate();
                }}
                onSelectPage={(id, dbId) => {
                  useUIStore.getState().setActivePageId(id);
                  if (dbId) {
                    navigate({ to: '/dashboard/db/$databaseId', params: { databaseId: dbId } });
                  } else {
                    navigate({ to: '/dashboard/p/$pageId', params: { pageId: id } });
                  }
                }}
                onSoftDelete={(id) => softDeleteMutation.mutate(id)}
                onUpdateMeta={(id, title, icon) => {
                  updateClientPageMeta(queryClient, { pageId: id, title, icon });
                  updateMetaMutation.mutate({ pageId: id, title, icon });
                }}
                onReorderPage={(input) => reorderPageMutation.mutate(input)}
                onTogglePin={(id) => togglePinMutation.mutate(id)}
                onDuplicatePage={async (id) => {
                  return await duplicatePageMutation.mutateAsync(id);
                }}
                onLogout={handleLogout}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Framed Workspace Main Area */}
        <div className="flex-1 bg-[#f3f2ee] dark:bg-[#121214] p-0 sm:p-2 overflow-hidden flex flex-col relative min-w-0 h-full">
          {/* Mobile Top Header Bar */}
          <MobileHeader
            workspaceName={session.workspaceName || `${session.name || 'Personal'}'s Workspace`}
            isCreatingPage={createPageMutation.isPending}
            onOpenMenu={() => useUIStore.getState().setMobileSidebarOpen(true)}
            onOpenSearch={() => useUIStore.getState().setSearchOpen(true)}
            onCreatePage={() => !createPageMutation.isPending && createPageMutation.mutate(undefined)}
          />

          {/* Desktop Tab Bar Header */}
          <TabBar
            tabs={openTabs}
            activeTabId={activeTabId}
            isCreatingPage={createPageMutation.isPending}
            onSelectTab={handleSelectTab}
            onCloseTab={handleCloseTab}
            onNewTab={() => !createPageMutation.isPending && createPageMutation.mutate(undefined)}
          />

          {/* Main Content Outlet */}
          <main className="flex-1 overflow-hidden relative flex flex-col min-h-0 bg-white dark:bg-[#18181b] border border-stone-200/90 dark:border-stone-800/80 rounded-xl max-sm:rounded-none mt-1 max-sm:mt-0 shadow-xs pb-0">
            <Outlet />
          </main>
        </div>

        {/* Modals & Overlays */}
        <CommandPalette
          workspaceId={session.workspaceId}
          onSelectPage={(id) => {
            useUIStore.getState().setActivePageId(id);
            navigate({ to: '/dashboard/p/$pageId', params: { pageId: id } });
          }}
        />
        <CreateWorkspaceModal
          isOpen={isCreateWorkspaceOpen}
          onClose={() => setIsCreateWorkspaceOpen(false)}
          onCreateWorkspace={async (data) => {
            await createWorkspaceMutation.mutateAsync(data);
          }}
        />
        <ImportModal
          workspaceId={session.workspaceId}
          onSelectPage={(id) => {
            useUIStore.getState().setActivePageId(id);
            navigate({ to: '/dashboard/p/$pageId', params: { pageId: id } });
          }}
        />
      </div>
    </>
  );
}
