import { createRoute, redirect } from '@tanstack/react-router';
import { getPublicPage } from '~/server/pages';
import { Route as rootRoute } from './__root';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pageId',
  loader: async ({ params }) => {
    try {
      const data = await getPublicPage({ data: params.pageId });
      if (data?.isLoggedIn && (data.accessLevel === 'editor' || data.isWorkspaceMember)) {
        throw redirect({ to: '/dashboard/p/$pageId', params: { pageId: params.pageId } });
      }
      // If public viewer, redirect to public share viewer
      throw redirect({ to: '/share/$pageId', params: { pageId: params.pageId } });
    } catch (err: any) {
      if (err?.to) throw err;
      throw redirect({ to: '/share/$pageId', params: { pageId: params.pageId } });
    }
  },
  component: () => null,
});
