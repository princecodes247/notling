import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { switchWorkspaceBySlug } from '~/server/auth';
import { useQueryClient } from '@tanstack/react-query';
import { FullScreenWordListLoader } from '~/components/FullScreenWordListLoader';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';

export const Route = createFileRoute('/w/$slug')({
  component: WorkspaceSlugRoute,
});

const SWITCHING_WORKSPACE_WORDS = [
  'Resolving workspace URL...',
  'Verifying member permissions...',
  'Switching active workspace...',
  'Opening dashboard...',
];

function WorkspaceSlugRoute() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function resolveWorkspace() {
      try {
        const res = await switchWorkspaceBySlug({ data: { slug } });
        if (res.success) {
          await queryClient.invalidateQueries({ queryKey: ['session'] });
          await queryClient.invalidateQueries({ queryKey: ['userWorkspaces'] });
          navigate({ to: '/dashboard' });
        } else {
          setError(res.error || 'Workspace not found or access denied.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to resolve workspace URL.');
      }
    }

    resolveWorkspace();
  }, [slug, navigate, queryClient]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#fafaf9] text-neutral-900 flex flex-col items-center justify-center p-6 select-none font-sans">
        <div className="w-full max-w-md bg-white border border-neutral-200 rounded-xl p-8 shadow-xs flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
            <HugeiconsIcon icon={Cancel01Icon} size={24} />
          </div>
          <h2 className="text-xl font-semibold text-neutral-950 mb-2">Workspace Route Error</h2>
          <p className="text-xs text-neutral-500 mb-6 leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => navigate({ to: '/dashboard' })}
            className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
          >
            Go to Default Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <FullScreenWordListLoader words={SWITCHING_WORKSPACE_WORDS} />;
}
