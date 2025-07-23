import { Separator } from '@usertour-packages/separator';
import { SettingsContent } from '../components/content';
import { EnvironmentListContent } from './components/environment-list-content';
import { EnvironmentListHeader } from './components/environment-list-header';

export const SettingsEnvironmentList = () => {
  return (
    <SettingsContent>
      <EnvironmentListHeader />
      <Separator />
      <EnvironmentListContent />
    </SettingsContent>
  );
};

SettingsEnvironmentList.displayName = 'SettingsEnvironmentList';
