import { IntegrationPlugIcon } from '@usertour-ui/icons';
import { Card } from '@usertour-ui/card';
import { Button } from '@usertour-ui/button';
import { Integration } from '@usertour-ui/types';
import { useIntegrationList } from '@/contexts/integration-list-context';

export const IntegrationListCard = ({ integration }: { integration: Integration }) => {
  const { toggleIntegration } = useIntegrationList();

  return (
    <Card key={integration.id} className="integration-card">
      <div className="integration-logo">
        <IntegrationPlugIcon width={40} height={40} />
      </div>
      <div className="integration-details">
        <h3>{integration.displayName}</h3>
        <p>{integration.codeName}</p>
      </div>
      <Button
        onClick={() => toggleIntegration(integration.id, !integration.enabled)}
        className="enable-button"
      >
        {integration.enabled ? 'Disable' : 'Enable'}
      </Button>
    </Card>
  );
};

IntegrationListCard.displayName = 'IntegrationListCard';
