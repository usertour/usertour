import { Suspense } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAppContext } from '@/contexts/app-context';
import { findSettingsSection, SettingsMode } from './registry';

export const SettingsDispatcher = () => {
  const { settingType, projectId } = useParams();
  const { can, project, loading, globalConfig } = useAppContext();

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

  // Mode + visible gates mirror the sidebar's filter (settings-sidebar-nav).
  // Without these, bookmarked URLs let users land on cloud-only or
  // self-hosted-only pages that the sidebar would have hidden, or on a
  // subscription page where `allowProjectLevelSubscriptionManagement` is
  // off. Defer evaluation until `globalConfig` has loaded so we don't
  // bounce out before knowing the deployment mode.
  if (globalConfig) {
    const currentMode = globalConfig.isSelfHostedMode
      ? SettingsMode.SELF_HOSTED
      : SettingsMode.CLOUD;
    if (!section.mode.includes(currentMode)) {
      return <Navigate to={`/project/${projectId}/settings/account`} replace />;
    }
    if (section.visible && !section.visible(globalConfig)) {
      return <Navigate to={`/project/${projectId}/settings/account`} replace />;
    }
  }

  const Component = section.component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
};

SettingsDispatcher.displayName = 'SettingsDispatcher';
