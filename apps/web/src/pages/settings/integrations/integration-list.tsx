import { Separator } from '@usertour/ui';
import { SettingsContent } from '../components/content';
import { IntegrationListContent } from './components/integration-list-content';
import { IntegrationListHeader } from './components/integration-list-header';

export const SettingsIntegrationList = () => {
  return (
    <SettingsContent>
      <IntegrationListHeader />
      <Separator />
      <IntegrationListContent />
    </SettingsContent>
  );
};
