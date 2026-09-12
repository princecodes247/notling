import { useMemo, useState, useEffect } from 'react';
import { createRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getPublicPage } from '~/server/pages';
import { Route as rootRoute } from './__root';
import { NotlingLogoIcon } from '~/components/Icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { LockIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/share/$pageId',
  component: PublicDocumentPageRoute,
});

function PublicBlockViewer({ content }: { content: any }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const initialContent = useMemo(() => {
    try {
      if (typeof content === 'string') return JSON.parse(content);
      if (Array.isArray(content) && content.length > 0) return content;
    } catch (e) {
      console.error('Failed to parse page content', e);
    }
    return undefined;
  }, [content]);

  const editor = useCreateBlockNote({
    initialContent,
  });

  if (!mounted) {
    return (
      <div className="min-h-[300px] flex items-center justify-center text-xs text-neutral-400">
        Loading document...
      </div>
    );
  }

  return (
    <div className="min-h-[300px] text-stone-900">
      <BlockNoteView
        editor={editor}
        theme="light"
        editable={false}
        sideMenu={false}
      />
    </div>
  );
}

function PublicDocumentPageRoute() {
  const { pageId } = Route.useParams();
  const navigate = useNavigate();

  const { data: page, isLoading, isError } = useQuery({
    queryKey: ['publicPage', pageId],
    queryFn: async () => {
      if (!pageId) return null;
      return await getPublicPage({ data: pageId });
    },
    enabled: !!pageId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#fafaf9] flex items-center justify-center text-xs text-neutral-400 font-sans">
        Loading shared document...
      </div>
    );
  }

  if (isError || !page) {
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

  return (
    <div className="min-h-screen w-full bg-white flex flex-col select-none">
      {/* Top Header */}
      <header className="h-14 border-b border-stone-200/70 px-6 sm:px-12 flex items-center justify-between bg-[#fdfcf9]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate({ to: '/' })}>
          <div className="w-7 h-7 rounded-lg bg-stone-900 text-amber-200/95 flex items-center justify-center shadow-xs">
            <NotlingLogoIcon className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-stone-900">Notling</span>
        </div>

        <button
          type="button"
          onClick={() => navigate({ to: '/login' })}
          className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold tracking-tight transition-all shadow-xs cursor-pointer active:scale-98"
        >
          Sign in
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 sm:py-16 bg-white min-h-screen">
        {/* Page Icon */}
        <div className="text-4xl mb-4">{page.icon || '📄'}</div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight mb-8">
          {page.title || 'Untitled Document'}
        </h1>

        {/* Content Render */}
        <div className="w-full">
          {page.content ? (
            <PublicBlockViewer content={page.content} />
          ) : (
            <p className="text-neutral-400 italic">This public page is empty.</p>
          )}
        </div>
      </main>
    </div>
  );
}
