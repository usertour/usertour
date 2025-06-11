import { SettingsAccountDetail } from '@/pages/settings';
import { SettingsAttributeList } from '@/pages/settings/attributes';
import { SettingsEnvironmentList } from '@/pages/settings/environments';
import { SettingsEventsList } from '@/pages/settings/events';
import { SettingsThemeList } from '@/pages/settings/themes';
import { useParams } from 'react-router-dom';
import { SettingsLocalizationList } from './localizations';
import { SettingsMemberList } from './members';
import { SettingsBilling } from './billing';
import { SettingsApiList } from './api';
import { SettingsProjectsDetail } from './projects';

export const AdminSettings = () => {
  const { settingType } = useParams();

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
    return <SettingsProjectsDetail />;
  }
  return <SettingsAccountDetail />;
};

AdminSettings.displayName = 'AdminSettings';
