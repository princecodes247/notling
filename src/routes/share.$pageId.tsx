import { useMemo, useState, useEffect } from 'react';
import { createRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getPublicPage, updatePageMeta, pingPagePresence } from '~/server/pages';
import { Route as rootRoute } from './__root';
import { NotlingLogoIcon } from '~/components/Icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { LockIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { BlockEditorInner } from '~/components/BlockEditorInner';
import { getClientId, useCollaboration } from '~/lib/collaboration';
import { ySyncPluginKey } from 'y-prosemirror';
import type { Page } from '~/db/schema';
import type { ActiveUserPresence } from '~/server/pages.db';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/share/$pageId',
  component: PublicDocumentPageRoute,
});

function ActiveCollaboratorsBar({ activeUsers, currentClientId }: { activeUsers: ActiveUserPresence[]; currentClientId?: string }) {
  if (!activeUsers || activeUsers.length === 0) return null;

  const displayUsers = activeUsers.slice(0, 4);
  const extraCount = activeUsers.length - displayUsers.length;

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center -space-x-1.5 overflow-hidden py-0.5">
        {displayUsers.map((user) => {
          const isEditor = user.role === 'editor';
          const isSelf = user.clientId === currentClientId;
          const initial = (user.name || user.email || 'U').charAt(0).toUpperCase();
          const displayName = user.name || user.email.split('@')[0];
          return (
            <div
              key={user.id || user.clientId || user.email}
              title={`${displayName}${isSelf ? ' (You)' : ''} — ${isEditor ? 'Editing' : 'Viewing'}`}
              className={`relative group w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-2xs cursor-pointer border-2 border-white transition-transform hover:scale-110 hover:z-10 ${
                isEditor ? 'bg-emerald-600' : 'bg-amber-600'
              }`}
            >
              <span>{initial}</span>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                  isEditor ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </div>
          );
        })}
      </div>

      {extraCount > 0 && (
        <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-full border border-stone-200">
          +{extraCount}
        </span>
      )}
    </div>
  );
}

function PublicBlockViewer({ pageId, content }: { pageId: string; content: any; userEmail?: string | null }) {
  const [mounted, setMounted] = useState(false);
  const collab = useCollaboration(pageId);

  useEffect(() => {
    setMounted(true);
  }, []);

  const parsedBlocks = useMemo(() => {
    try {
      if (typeof content === 'string') return JSON.parse(content);
      if (Array.isArray(content) && content.length > 0) return content;
    } catch (e) {
      console.error('Failed to parse page content', e);
    }
    return undefined;
  }, [content]);

  const editorOptions = useMemo(() => {
    return {
      initialContent: parsedBlocks && parsedBlocks.length > 0 ? parsedBlocks : undefined,
      collaboration: collab
        ? {
            provider: {
              ...collab.provider,
              awareness: undefined,
            },
            fragment: collab.fragment,
            user: { name: '', color: 'transparent' },
          }
        : undefined,
    };
  }, [collab, parsedBlocks]);

  const editor = useCreateBlockNote(editorOptions, [pageId]);

  // Prevent any local click/drag/keyboard events on the read-only viewer from modifying the shared document
  useEffect(() => {
    const pmView = editor?.prosemirrorView;
    if (!pmView || (pmView as any).__readOnlyGuarded) return;
    (pmView as any).__readOnlyGuarded = true;

    const originalDispatch = pmView.dispatch.bind(pmView);
    pmView.dispatch = (tr: any) => {
      // If a local transaction on the viewer attempts to modify document nodes, block it
      if (tr.docChanged && !tr.getMeta(ySyncPluginKey)) {
        return;
      }
      originalDispatch(tr);
    };
  }, [editor]);

  // Neutralize SideMenuPlugin.isDragOrigin on the viewer
  useEffect(() => {
    const patchSideMenuView = () => {
      const sideMenuView = (editor as any)?.sideMenu?.view;
      if (sideMenuView && !sideMenuView.__dragOriginPatched) {
        sideMenuView.__dragOriginPatched = true;
        Object.defineProperty(sideMenuView, 'isDragOrigin', {
          get: () => false,
          set: () => {},
          configurable: true,
        });
      }
    };
    patchSideMenuView();
    const timer = setTimeout(patchSideMenuView, 100);
    return () => clearTimeout(timer);
  }, [editor]);

  // Seed viewer blocks if editor is blank and Yjs fragment has no blocks yet
  useEffect(() => {
    if (!editor || !parsedBlocks || parsedBlocks.length === 0) return;
    const currentDoc = editor.document;
    const isDocEmpty =
      currentDoc.length === 0 ||
      (currentDoc.length === 1 &&
        currentDoc[0].type === 'paragraph' &&
        (!currentDoc[0].content || (Array.isArray(currentDoc[0].content) && currentDoc[0].content.length === 0)));

    if (isDocEmpty && collab && collab.fragment.length === 0 && currentDoc.length > 0) {
      try {
        editor.replaceBlocks(currentDoc, parsedBlocks);
      } catch (err) {
        console.error('Failed to populate initial viewer blocks:', err);
      }
    }
  }, [editor, collab, parsedBlocks]);

  if (!mounted) {
    return (
      <div className="min-h-[300px] flex items-center justify-center text-xs text-neutral-400">
        Loading document...
      </div>
    );
  }

  return (
    <div
      className="min-h-[300px] text-stone-900 select-text"
      onMouseDown={() => {
        const sideMenuView = (editor as any)?.sideMenu?.view;
        if (sideMenuView) {
          sideMenuView.isDragOrigin = false;
        }
      }}
    >
      <BlockNoteView
        editor={editor}
        theme="light"
        editable={false}
        sideMenu={false}
      />
    </div>
  );
}

function SharedEditablePage({ page }: { page: Page }) {
  const [title, setTitle] = useState(page.title);
  const [icon] = useState(page.icon || '📄');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setTitle(page.title);
  }, [page.title]);

  const handleTitleBlur = async () => {
    if (title !== page.title) {
      await updatePageMeta({
        data: { pageId: page.id, title, icon },
      });
    }
  };

  return (
    <div className="w-full flex flex-col">
      {/* Icon */}
      <div className="text-4xl mb-3">{icon}</div>

      {/* Title Input */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        placeholder="Untitled Document"
        className="w-full bg-transparent text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 placeholder-stone-300 focus:outline-none mb-4 border-b border-transparent focus:border-stone-200/80 pb-1.5 transition-colors"
      />

      {/* Interactive Block Editor */}
      {mounted ? (
        <BlockEditorInner key={page.id} page={{ ...page, title, icon }} />
      ) : (
        <div className="min-h-[300px] flex items-center justify-center text-xs text-neutral-400">
          Loading editor...
        </div>
      )}
    </div>
  );
}

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
    staleTime: 5000,
  });

  const userEmail = sharedData?.userEmail ?? null;

  // Heartbeat presence ping every 3 seconds
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
      } catch {}
    };
    sendPing();
    const timer = setInterval(sendPing, 3000);
    return () => clearInterval(timer);
  }, [pageId, sharedData?.accessLevel, userEmail]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#fafaf9] flex items-center justify-center text-xs text-neutral-400 font-sans">
        Loading shared document...
      </div>
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
            onClick={() => navigate({ to: '/login' })}
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
      <header className="h-14 border-b border-stone-200/70 px-6 sm:px-12 flex items-center justify-between bg-[#fdfcf9]/90 backdrop-blur-md sticky top-0 z-30">
        <div
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => navigate({ to: isLoggedIn ? '/dashboard' : '/' })}
        >
          <div className="w-7 h-7 rounded-lg bg-stone-900 text-amber-200/95 flex items-center justify-center shadow-xs">
            <NotlingLogoIcon className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-stone-900">Notling</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Collaborator Avatars */}
          <ActiveCollaboratorsBar activeUsers={activeUsers} currentClientId={getClientId()} />

          {/* Access Status Badge */}
          {accessLevel === 'editor' ? (
            <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] animate-pulse" />
              <span>Can edit</span>
            </span>
          ) : (
            <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center gap-1.5 shadow-2xs">
              <HugeiconsIcon icon={LockIcon} size={11} />
              <span>View only</span>
            </span>
          )}

          {/* Shortcut to Workspace Dashboard if workspace member */}
          {isWorkspaceMember && (
            <button
              type="button"
              onClick={() => navigate({ to: '/dashboard/p/$pageId', params: { pageId: page.id } })}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold tracking-tight transition-colors cursor-pointer"
            >
              <span>Open in Dashboard</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
            </button>
          )}

          {/* User Status / Profile */}
          {isLoggedIn ? (
            <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
              <div className="w-7 h-7 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-semibold shadow-2xs">
                {(userEmail || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-stone-700 hidden md:inline truncate max-w-[140px]">
                {userEmail}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate({ to: '/login' })}
              className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold tracking-tight transition-all shadow-xs cursor-pointer active:scale-98"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 sm:py-16 bg-white min-h-screen">
        {accessLevel === 'editor' ? (
          <SharedEditablePage page={page as any} />
        ) : (
          <div className="w-full flex flex-col">
            <div className="text-4xl mb-4">{page.icon || '📄'}</div>
            <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight mb-8">
              {page.title || 'Untitled Document'}
            </h1>
            {page.content ? (
              <PublicBlockViewer pageId={page.id} content={page.content} userEmail={userEmail} />
            ) : (
              <p className="text-neutral-400 italic">This public page is empty.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
