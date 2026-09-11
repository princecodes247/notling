import { createRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getSession } from '~/server/auth';
import { SettingsView } from '~/components/dashboard/SettingsView';
import { Route as dashboardRoute } from './dashboard';

export const Route = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/settings',
  component: DashboardSettingsPage,
});

function DashboardSettingsPage() {
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => await getSession(),
  });

  return <SettingsView session={session} />;
}
