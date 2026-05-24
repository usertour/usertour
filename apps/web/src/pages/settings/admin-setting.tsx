import { Suspense } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAppContext } from '@/contexts/app-context';
import { findSettingsSection } from './registry';

export const AdminSettings = () => {
  const { settingType, projectId } = useParams();
  const { can, project, loading } = useAppContext();

  // Legacy alias — `companies` was an old settings entry that has since
  // collapsed into `general`. Keep the redirect for any bookmarked URLs.
  if (settingType === 'companies') {
    return <Navigate to={`/project/${projectId}/settings/general`} replace />;
  }

  const section = findSettingsSection(settingType);

  // Unknown section → land on the always-available Account page rather
  // than rendering nothing. Same fallback the original if-else chain used.
  if (!section) {
    return <Navigate to={`/project/${projectId}/settings/account`} replace />;
  }

  // Defense-in-depth for direct URL access (the sidebar already hides
  // sections the user lacks capability for). Only redirect once
  // capabilities are known, to avoid bouncing during initial load.
  if (section.capability && project && !loading && !can(section.capability)) {
    return <Navigate to={`/project/${projectId}/settings/account`} replace />;
  }

  const Component = section.component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
};

AdminSettings.displayName = 'AdminSettings';
