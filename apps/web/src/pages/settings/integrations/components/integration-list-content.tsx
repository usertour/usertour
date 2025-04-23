import { IntegrationListCard } from './integration-list-card';
import { useIntegrationList } from '@/contexts/integration-list-context';

export const IntegrationListContent = () => {
  const { integrations } = useIntegrationList();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {integrations.map((integration) => (
        <IntegrationListCard key={integration.id} integration={integration} />
      ))}
    </div>
  );
};

IntegrationListContent.displayName = 'IntegrationListContent';
