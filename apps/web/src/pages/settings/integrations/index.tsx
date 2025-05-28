import { Separator } from '@usertour-ui/separator';
import { SettingsContent } from '../components/content';
import { IntegrationsListContent } from './components/integrations-list-content';
import { IntegrationsListHeader } from './components/integrations-list-header';
import { ApiProvider } from '@/contexts/api-context';

export const SettingsIntegrationsList = () => {
  return (
    <SettingsContent>
      <ApiProvider>
        <IntegrationsListHeader />
        <Separator />
        <IntegrationsListContent />
      </ApiProvider>
    </SettingsContent>
  );
};
