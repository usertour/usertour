import {
  ExportEventsCard,
  ExportEventsCardSkeleton,
  IntegrationProviderHeader,
  IntegrationProviderHeaderSkeleton,
} from '@usertour/business-components';
import { integrations } from '@/utils/integration';
import { useIntegrationConfig } from '../hooks/use-integration-config';

interface PosthogIntegrationConfig {
  region?: string;
  exportEvents?: boolean;
}

const INTEGRATION_PROVIDER = 'posthog' as const;
const DOCS_HREF = 'https://docs.usertour.io/how-to-guides/environments/';

export const PosthogIntegration = () => {
  const config = useIntegrationConfig<PosthogIntegrationConfig>(INTEGRATION_PROVIDER);
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
        name={info?.name ?? 'PostHog'}
        description={info?.description}
        docs={{ href: DOCS_HREF, label: 'Read the PostHog guide' }}
      />
      <ExportEventsCard
        providerName="PostHog"
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

PosthogIntegration.displayName = 'PosthogIntegration';
