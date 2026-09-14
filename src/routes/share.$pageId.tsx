import { useEffect } from 'react';
import { createRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getPublicPage, pingPagePresence, removePagePresence } from '~/server/pages';
import { Route as rootRoute } from './__root';
import { HugeiconsIcon } from '@hugeicons/react';
import { LockIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { getClientId } from '~/lib/collaboration';
import { FullScreenWordListLoader } from '~/components/FullScreenWordListLoader';
import { ShareHeader } from '~/components/share/ShareHeader';
import { SharedEditablePage } from '~/components/share/SharedEditablePage';
import { PublicBlockViewer } from '~/components/share/PublicBlockViewer';

const SHARED_PAGE_LOADING_WORDS = [
  'Locating shared document...',
  'Verifying public access...',
  'Rendering page blocks...',
  'Opening document...',
];

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/share/$pageId',
  loader: async ({ params }) => {
    try {
      return await getPublicPage({ data: params.pageId });
    } catch {
      return null;
    }
  },
  head: ({ loaderData }) => {
    const pageTitle = loaderData?.page?.title || 'Shared Document';
    const displayTitle = `${pageTitle} - Notling`;

    return {
      meta: [
        { title: displayTitle },
        { name: 'description', content: `View shared document "${pageTitle}" on Notling.` },
        { property: 'og:title', content: pageTitle },
        { property: 'og:description', content: `View shared document "${pageTitle}" on Notling.` },
        { property: 'og:type', content: 'article' },
        { property: 'og:site_name', content: 'Notling' },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: pageTitle },
        { name: 'twitter:description', content: `View shared document "${pageTitle}" on Notling.` },
      ],
    };
  },
  component: PublicDocumentPageRoute,
});

function PublicDocumentPageRoute() {
  const { pageId } = Route.useParams();
  const navigate = useNavigate();

  const { data: sharedData, isLoading, isError } = useQuery({
    queryKey: ['publicPage', pageId],
    queryFn: async () => {
      if (!pageId) return null;
      return await getPublicPage({ data: pageId });
    },
    enabled: !!pageId,
    staleTime: 1000,
    refetchInterval: 1500,
  });

  const userEmail = sharedData?.userEmail ?? null;

  // Auto-redirect logged-in users directly to their dashboard document view
  useEffect(() => {
    if (sharedData?.isLoggedIn && pageId) {
      navigate({ to: '/dashboard/p/$pageId', params: { pageId } });
    }
  }, [sharedData?.isLoggedIn, pageId, navigate]);

  // Synchronize document.title for viewers on share page
  useEffect(() => {
    if (sharedData?.page?.title) {
      document.title = `${sharedData.page.title || 'Untitled Document'} - Notling`;
    }
  }, [sharedData?.page?.title]);

  // Heartbeat presence ping & immediate cleanup on unmount/leave
  useEffect(() => {
    if (!pageId || !sharedData) return;
    const cid = getClientId();
    const sendPing = async () => {
      try {
        await pingPagePresence({
          data: {
            pageId,
            role: sharedData.accessLevel,
            clientId: cid,
            guestName: userEmail ? undefined : `Guest ${cid.slice(-4)}`,
          },
        });
      } catch { }
    };
    sendPing();
    const timer = setInterval(sendPing, 3000);

    const handleLeave = () => {
      try {
        removePagePresence({ data: { pageId, clientId: cid } });
      } catch { }
    };

    window.addEventListener('beforeunload', handleLeave);

    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', handleLeave);
      handleLeave();
    };
  }, [pageId, sharedData?.accessLevel, userEmail]);

  const handleSignInToEdit = () => {
    if (pageId) {
      sessionStorage.setItem('notling_auth_redirect', `/share/${pageId}`);
    }
    navigate({ to: '/login', search: pageId ? ({ redirect: `/share/${pageId}` } as any) : undefined });
  };


  if (isLoading) {
    return (
      <FullScreenWordListLoader
        words={SHARED_PAGE_LOADING_WORDS}
        theme='light'
      />
    );
  }

  if (isError || !sharedData) {
    return (
      <div className="min-h-screen w-full bg-[#fafaf9] flex flex-col items-center justify-center p-6 text-neutral-900 font-sans select-none">
        <div className="w-full max-w-md bg-white border border-neutral-200/90 rounded-xl p-8 shadow-xs flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-lg bg-neutral-100 text-neutral-500 flex items-center justify-center mb-4">
            <HugeiconsIcon icon={LockIcon} size={24} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-950">This document is private</h1>
          <p className="text-xs text-neutral-500 mt-2 mb-6 leading-relaxed">
            The page you are looking for may have been deleted, set to workspace-only visibility, or made private by its author.
          </p>
          <button
            type="button"
            onClick={handleSignInToEdit}
            className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <span>Sign in to Notling</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
          </button>
        </div>
      </div>
    );
  }

  const { page, accessLevel, isLoggedIn, isWorkspaceMember, activeUsers } = sharedData;

  return (
    <div className="min-h-screen w-full bg-white flex flex-col select-none">
      {/* Top Header */}
      <ShareHeader
        pageId={page.id}
        accessLevel={accessLevel}
        isLoggedIn={isLoggedIn}
        isWorkspaceMember={isWorkspaceMember}
        userEmail={userEmail}
        activeUsers={activeUsers}
        currentClientId={getClientId()}
        page={page}
        onNavigateHome={() => navigate({ to: isLoggedIn ? '/dashboard' : '/' })}
        onOpenDashboard={() => navigate({ to: '/dashboard/p/$pageId', params: { pageId: page.id } })}
        onSignIn={handleSignInToEdit}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 sm:py-16 bg-white min-h-screen">
        {accessLevel === 'editor' ? (
          <SharedEditablePage page={page as any} />
        ) : (
          <div className="w-full flex flex-col">
            {/* Prompt for unauthenticated viewers if page is set to public_edit */}
            {page.visibility === 'public_edit' && !isLoggedIn && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={LockIcon} size={16} />
                  </div>
                  <div>
                    <span className="font-semibold text-amber-900 block text-xs">Sign in to edit this document</span>
                    <span className="text-amber-700 text-[11px]">Editing is enabled for all signed-in users.</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignInToEdit}
                  className="px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs transition-colors shrink-0 shadow-2xs cursor-pointer"
                >
                  Sign in to Edit
                </button>
              </div>
            )}

            <div className="text-4xl mb-4">{page.icon || '📄'}</div>
            <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight mb-8">
              {page.title || 'Untitled Document'}
            </h1>
            <PublicBlockViewer pageId={page.id} content={page.content} userEmail={userEmail} />
          </div>
        )}
      </main>
    </div>
  );
}
