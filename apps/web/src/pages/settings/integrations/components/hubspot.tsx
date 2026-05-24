import {
  ExportEventsCard,
  ExportEventsCardSkeleton,
  IntegrationProviderHeader,
  IntegrationProviderHeaderSkeleton,
} from '@usertour/business-components';
import { integrations } from '@/utils/integration';
import { useIntegrationConfig } from '../hooks/use-integration-config';

interface HubSpotIntegrationConfig {
  exportEvents?: boolean;
}

const INTEGRATION_PROVIDER = 'hubspot' as const;
const DOCS_HREF = 'https://docs.usertour.io/how-to-guides/environments/';

export const HubSpotIntegration = () => {
  const config = useIntegrationConfig<HubSpotIntegrationConfig>(INTEGRATION_PROVIDER);
  const info = integrations.find((entry) => entry.provider === INTEGRATION_PROVIDER);

  if (config.isDataLoading) {
    return (
      <>
        <IntegrationProviderHeaderSkeleton />
        <ExportEventsCardSkeleton />
      </>
    );
  }

  return (
    <>
      <IntegrationProviderHeader
        imagePath={info?.imagePath ?? ''}
        name={info?.name ?? 'HubSpot'}
        description={info?.description}
        docs={{ href: DOCS_HREF, label: 'Read the HubSpot guide' }}
      />
      <ExportEventsCard
        providerName="HubSpot"
        integration={config.integration}
        currentIntegration={config.currentIntegration}
        setLocal={config.setLocal}
        save={config.save}
        isLoading={config.isLoading}
      />
    </>
  );
};

HubSpotIntegration.displayName = 'HubSpotIntegration';
