import { Separator } from '@usertour-ui/separator';
import { SettingsContent } from '../components/content';
import { IntegrationListHeader } from './components/integration-list-header';
import { IntegrationListContent } from './components/integration-list-content';
import { useAppContext } from '@/contexts/app-context';

export const SettingsIntegrationsList = () => {
  const { project } = useAppContext();
  return (
    <SettingsContent>
      <IntegrationListHeader />
      <Separator />
      <IntegrationListContent projectId={project?.id} />
    </SettingsContent>
  );
};

SettingsIntegrationsList.displayName = 'SettingsIntegrationsList';
