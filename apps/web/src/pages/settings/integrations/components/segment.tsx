import { useTranslation } from 'react-i18next';
import {
  ExportEventsCard,
  ExportEventsCardSkeleton,
  IntegrationProviderHeader,
  IntegrationProviderHeaderSkeleton,
} from '@usertour/business-components';
import { integrations } from '@/utils/integration';
import { useIntegrationConfig } from '../hooks/use-integration-config';

interface SegmentIntegrationConfig {
  region?: string;
  exportEvents?: boolean;
}

const INTEGRATION_PROVIDER = 'segment' as const;
const PROVIDER_NAME = 'Segment';
const DOCS_HREF = 'https://docs.usertour.io/how-to-guides/environments/';

export const SegmentIntegration = () => {
  const config = useIntegrationConfig<SegmentIntegrationConfig>(INTEGRATION_PROVIDER);
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
        keyLabel="Write Key :"
        keyPlaceholder="Type Write Key here"
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

SegmentIntegration.displayName = 'SegmentIntegration';
