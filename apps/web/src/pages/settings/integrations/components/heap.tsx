import {
  ExportEventsCard,
  ExportEventsCardSkeleton,
  IntegrationProviderHeader,
  IntegrationProviderHeaderSkeleton,
} from '@usertour/business-components';
import { integrations } from '@/utils/integration';
import { useIntegrationConfig } from '../hooks/use-integration-config';

interface HeapIntegrationConfig {
  exportEvents?: boolean;
}

const INTEGRATION_PROVIDER = 'heap' as const;
const DOCS_HREF = 'https://docs.usertour.io/how-to-guides/environments/';

export const HeapIntegration = () => {
  const config = useIntegrationConfig<HeapIntegrationConfig>(INTEGRATION_PROVIDER);
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
        name={info?.name ?? 'Heap'}
        description={info?.description}
        docs={{ href: DOCS_HREF, label: 'Read the Heap guide' }}
      />
      <ExportEventsCard
        providerName="Heap"
        keyLabel="Heap App ID :"
        keyPlaceholder="Type Heap App ID here"
        integration={config.integration}
        currentIntegration={config.currentIntegration}
        setLocal={config.setLocal}
        save={config.save}
        isLoading={config.isLoading}
      />
    </>
  );
};

HeapIntegration.displayName = 'HeapIntegration';
