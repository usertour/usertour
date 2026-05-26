import { useTranslation } from 'react-i18next';
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
const PROVIDER_NAME = 'HubSpot';
const DOCS_HREF = 'https://docs.usertour.io/how-to-guides/environments/';

export const HubSpotIntegration = () => {
  const config = useIntegrationConfig<HubSpotIntegrationConfig>(INTEGRATION_PROVIDER);
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
        integration={config.integration}
        currentIntegration={config.currentIntegration}
        setLocal={config.setLocal}
        save={config.save}
        isLoading={config.isLoading}
        keyLabel={t('settings.integrations.providerCard.hubspotKeyLabel')}
        keyPlaceholder={t('settings.integrations.providerCard.hubspotKeyPlaceholder')}
      />
    </>
  );
};

HubSpotIntegration.displayName = 'HubSpotIntegration';
