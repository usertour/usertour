import {
  ExportEventsCard,
  ExportEventsCardSkeleton,
  IntegrationProviderHeader,
  IntegrationProviderHeaderSkeleton,
} from '@usertour/business-components';
import { integrations } from '@/utils/integration';
import { useIntegrationConfig } from '../hooks/use-integration-config';

interface AmplitudeIntegrationConfig {
  region?: string;
  exportEvents?: boolean;
}

const INTEGRATION_PROVIDER = 'amplitude' as const;
const DOCS_HREF = 'https://docs.usertour.io/how-to-guides/environments/';

export const AmplitudeIntegration = () => {
  const config = useIntegrationConfig<AmplitudeIntegrationConfig>(INTEGRATION_PROVIDER);
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
        name={info?.name ?? 'Amplitude'}
        description={info?.description}
        docs={{ href: DOCS_HREF, label: 'Read the Amplitude guide' }}
      />
      <ExportEventsCard
        providerName="Amplitude"
        integration={config.integration}
        currentIntegration={config.currentIntegration}
        setLocal={config.setLocal}
        save={config.save}
        isLoading={config.isLoading}
        region={{
          defaultValue: 'US',
          options: [
            { value: 'US', label: 'Default(US)' },
            { value: 'EU', label: 'EU' },
          ],
        }}
      />
    </>
  );
};

AmplitudeIntegration.displayName = 'AmplitudeIntegration';
