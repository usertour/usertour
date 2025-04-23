import { Card } from '@usertour-ui/card';
import { Button } from '@usertour-ui/button';
import { Integration, integrationImages } from '@usertour-ui/types';
import { useIntegrationList } from '@/contexts/integration-list-context';

export const IntegrationListCard = ({ integration }: { integration: Integration }) => {
  const { toggleIntegration } = useIntegrationList();

  return (
    <Card
      key={integration.id}
      className="h-52 min-w-80 bg-white rounded-lg border border-gray-100 hover:border-white dark:border-gray-800 dark:hover:border-gray-700 hover:shadow-lg dark:hover:shadow-lg-light dark:bg-gray-900"
    >
      <div className="flex flex-col h-full">
        {/* Header Section */}
        <div className="bg-slate-50 dark:bg-gray-800 rounded-t-md py-2.5 px-5 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-row grow space-x-2">
            <span className="text-base font-medium text-gray-900 dark:text-white max-w-40 truncate">
              {integration.displayName}
            </span>
            {integration.enabled && (
              <span className="bg-primary px-1.5 py-0.5 rounded text-sm font-normal text-primary-foreground">
                Enabled
              </span>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex justify-center items-center h-full flex-col space-y-2">
          <img
            src={integrationImages[integration.codeName] || '/images/integrations/default.png'}
            alt={integration.displayName}
            className="w-32 h-24 object-contain"
          />
        </div>

        {/* Footer Section */}
        <div className="flex justify-center items-center py-2 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={() =>
              toggleIntegration(integration.id, !integration.enabled, integration.displayName)
            }
            variant={integration.enabled ? 'secondary' : 'default'}
            className="w-24"
          >
            {integration.enabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

IntegrationListCard.displayName = 'IntegrationListCard';
