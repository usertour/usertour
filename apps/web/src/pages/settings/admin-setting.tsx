import { useAppContext } from '@/contexts/app-context';
import { SettingsAccountDetail } from '@/pages/settings';
import { SettingsAttributeList } from '@/pages/settings/attributes';
import { SettingsEnvironmentList } from '@/pages/settings/environments';
import { SettingsEventsList } from '@/pages/settings/events';
import { SettingsThemeList } from '@/pages/settings/themes';
import { Capability } from '@usertour/types';
import { useParams } from 'react-router-dom';
import { SettingsLocalizationList } from './localizations';
import { SettingsMemberList } from './members';
import { SettingsBilling } from './billing';
import { SettingsApiList } from './api';
import { SettingsProjectsDetail } from './projects';
import { SettingsIntegrationsList } from './integrations';
import { SettingsSubscription } from './subscription/';
import { Navigate } from 'react-router-dom';

// Capability each settings section requires. Sections omitted here (account,
// the companies redirect, the default) aren't project-scoped and stay open.
// Mirrors the settings sidebar so direct-URL access matches what the nav shows.
const SETTING_CAPABILITY: Record<string, Capability> = {
  general: Capability.ProjectManage,
  themes: Capability.ThemeRead,
  environments: Capability.EnvironmentRead,
  attributes: Capability.AttributeRead,
  events: Capability.EventRead,
  localizations: Capability.LocalizationRead,
  team: Capability.TeamRead,
  billing: Capability.BillingRead,
  subscription: Capability.BillingRead,
  api: Capability.AccessTokenRead,
  integrations: Capability.IntegrationRead,
};

export const AdminSettings = () => {
  const { settingType, projectId } = useParams();
  const { can, project, loading } = useAppContext();

  // Defense-in-depth for direct URL access (the nav already hides these). Only
  // redirect once capabilities are known, to avoid bouncing during initial load.
  const requiredCapability = settingType ? SETTING_CAPABILITY[settingType] : undefined;
  if (requiredCapability && project && !loading && !can(requiredCapability)) {
    return <Navigate to={`/project/${projectId}/settings/account`} replace />;
  }

  if (settingType === 'themes') {
    return <SettingsThemeList />;
  }
  if (settingType === 'environments') {
    return <SettingsEnvironmentList />;
  }
  if (settingType === 'attributes') {
    return <SettingsAttributeList />;
  }
  if (settingType === 'events') {
    return <SettingsEventsList />;
  }
  if (settingType === 'localizations') {
    return <SettingsLocalizationList />;
  }
  if (settingType === 'team') {
    return <SettingsMemberList />;
  }
  if (settingType === 'billing') {
    return <SettingsBilling />;
  }
  if (settingType === 'api') {
    return <SettingsApiList />;
  }
  if (settingType === 'companies') {
    return <Navigate to={`/project/${projectId}/settings/general`} replace />;
  }
  if (settingType === 'general') {
    return <SettingsProjectsDetail />;
  }
  if (settingType === 'integrations') {
    return <SettingsIntegrationsList />;
  }
  if (settingType === 'subscription') {
    return <SettingsSubscription />;
  }
  return <SettingsAccountDetail />;
};

AdminSettings.displayName = 'AdminSettings';
