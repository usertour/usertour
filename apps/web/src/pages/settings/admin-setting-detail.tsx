import { Suspense } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAppContext } from '@/contexts/app-context';
import { findSettingsSection } from './registry';

export const AdminSettingsDetail = () => {
  const { settingType, projectId } = useParams();
  const { can, project, loading } = useAppContext();

  const section = findSettingsSection(settingType);

  if (!section?.detail) {
    return <Navigate to={`/project/${projectId}/settings/account`} replace />;
  }

  // Defense-in-depth: same capability gate as the parent section.
  if (section.capability && project && !loading && !can(section.capability)) {
    return <Navigate to={`/project/${projectId}/settings/account`} replace />;
  }

  const Component = section.detail.component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
};

AdminSettingsDetail.displayName = 'AdminSettingsDetail';
