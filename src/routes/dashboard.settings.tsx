import { createFileRoute, createRoute } from '@tanstack/react-router';
import React from 'react';
import { SettingsView } from '~/components/dashboard/SettingsView';
import { Route as dashboardRoute } from './dashboard';

export const Route = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/settings',
  component: DashboardSettingsPage,
});

// export const Route = createFileRoute('/dashboard/settings')({
//   component: DashboardSettingsPage,
// });

function DashboardSettingsPage() {
  return <SettingsView />;
}
