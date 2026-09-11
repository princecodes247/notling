import { createRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getPublicPage } from '~/server/pages';
import { Route as rootRoute } from './__root';
import { NotlingLogoIcon } from '~/components/Icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { LockIcon, Globe02Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/share/$pageId',
  component: PublicDocumentPageRoute,
});

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
        <div className="w-full max-w-md bg-white border border-neutral-200/90 rounded-2xl p-8 shadow-xs flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-500 flex items-center justify-center mb-4">
            <HugeiconsIcon icon={LockIcon} size={24} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-950">This document is private</h1>
          <p className="text-xs text-neutral-500 mt-2 mb-6 leading-relaxed">
            The page you are looking for may have been deleted, set to workspace-only visibility, or made private by its author.
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: '/login' })}
            className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white font-medium rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <span>Sign in to Notling</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="h-14 border-b border-neutral-200/80 px-6 sm:px-12 flex items-center justify-between bg-white sticky top-0 z-30">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate({ to: '/' })}>
          <div className="w-7 h-7 rounded-lg bg-neutral-950 text-white flex items-center justify-center">
            <NotlingLogoIcon className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-neutral-900">Notling</span>
        </div>

        <button
          type="button"
          onClick={() => navigate({ to: '/login' })}
          className="px-3.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-medium transition-all shadow-2xs cursor-pointer"
        >
          Sign in
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10 sm:py-14 bg-white min-h-screen">
        {/* Page Icon */}
        <div className="text-4xl mb-4">{page.icon || '📄'}</div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-950 tracking-tight mb-6">
          {page.title || 'Untitled Document'}
        </h1>

        {/* Content Render */}
        <div className="prose prose-neutral max-w-none text-neutral-800 text-sm leading-relaxed space-y-3">
          {Array.isArray(page.content) && page.content.length > 0 ? (
            page.content.map((block: any, idx: number) => (
              <RenderPublicBlock key={block.id || idx} block={block} />
            ))
          ) : (
            <p className="text-neutral-400 italic">This public page is empty.</p>
          )}
        </div>
      </main>
    </div>
  );
}

function RenderPublicBlock({ block }: { block: any }) {
  if (!block) return null;

  const type = block.type || 'paragraph';

  // Extract inline text
  let text = '';
  if (Array.isArray(block.content)) {
    text = block.content.map((c: any) => c.text || '').join('');
  } else if (typeof block.content === 'string') {
    text = block.content;
  }

  if (type === 'heading') {
    const level = block.props?.level || 1;
    if (level === 1) return <h1 className="text-2xl font-bold text-neutral-900 mt-6 mb-2">{text}</h1>;
    if (level === 2) return <h2 className="text-xl font-bold text-neutral-900 mt-5 mb-2">{text}</h2>;
    return <h3 className="text-lg font-semibold text-neutral-900 mt-4 mb-1">{text}</h3>;
  }

  if (type === 'bulletListItem') {
    return (
      <li className="list-disc ml-5 text-neutral-800 my-1">
        {text}
      </li>
    );
  }

  if (type === 'checkListItem') {
    const checked = block.props?.checked;
    return (
      <div className="flex items-center gap-2 my-1">
        <input type="checkbox" checked={!!checked} readOnly className="rounded border-neutral-300" />
        <span className={checked ? 'line-through text-neutral-400' : 'text-neutral-800'}>{text}</span>
      </div>
    );
  }

  return <p className="text-neutral-800 my-2 leading-relaxed">{text}</p>;
}
