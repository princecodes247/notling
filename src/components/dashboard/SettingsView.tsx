import React from 'react';
import { WorkspaceSettingsView } from './WorkspaceSettingsView';
import { ProfileSettingsView } from './ProfileSettingsView';
import type { UserSession } from '~/server/auth';

interface SettingsViewProps {
  session?: UserSession | null;
}

export const SettingsView: React.FC<SettingsViewProps> = (props) => {
  return <WorkspaceSettingsView {...props} />;
};

export { WorkspaceSettingsView, ProfileSettingsView };
