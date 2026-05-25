import { Separator } from '@usertour/separator';
import { SettingsContent } from '../components/content';
import { IntegrationListContent } from './components/integration-list-content';
import { IntegrationListHeader } from './components/integration-list-header';
import { ApiProvider } from '@/contexts/api-context';

export const SettingsIntegrationList = () => {
  return (
    <SettingsContent>
      <ApiProvider>
        <IntegrationListHeader />
        <Separator />
        <IntegrationListContent />
      </ApiProvider>
    </SettingsContent>
  );
};
