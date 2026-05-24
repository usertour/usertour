import { useTranslation } from 'react-i18next';
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
const PROVIDER_NAME = 'Heap';
const DOCS_HREF = 'https://docs.usertour.io/how-to-guides/environments/';

export const HeapIntegration = () => {
  const config = useIntegrationConfig<HeapIntegrationConfig>(INTEGRATION_PROVIDER);
  const info = integrations.find((entry) => entry.provider === INTEGRATION_PROVIDER);
  const { t } = useTranslation();

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
        name={info?.name ?? PROVIDER_NAME}
        description={info?.description}
        docs={{
          href: DOCS_HREF,
          label: t('settings.integrations.providerHeaderReadGuide', { provider: PROVIDER_NAME }),
        }}
      />
      <ExportEventsCard
        providerName={PROVIDER_NAME}
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
