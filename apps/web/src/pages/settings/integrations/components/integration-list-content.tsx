import { IntegrationListCard } from './integration-list-card';
import { useIntegrationList } from '@/contexts/integration-list-context';

export const IntegrationListContent = () => {
  const { integrations } = useIntegrationList();
  return (
    <div className="integration-list">
      {integrations.map((integration) => (
        <IntegrationListCard key={integration.id} integration={integration} />
      ))}
    </div>
  );
};

IntegrationListContent.displayName = 'IntegrationListContent';
