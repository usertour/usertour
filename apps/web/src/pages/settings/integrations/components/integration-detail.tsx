import { useParams } from 'react-router-dom';
import { MixpanelIntegration } from './mixpanel-integration';
import { PostHogIntegration } from './posthog-integration';
import { AmplitudeIntegration } from './amplitude-integration';
import { HeapIntegration } from './heap-integration';
import { HubSpotIntegration } from './hubspot-integration';
import { SegmentIntegration } from './segment-integration';
import { SalesforceIntegration } from './salesforce-integration';

export const IntegrationDetail = () => {
  const { settingSubType } = useParams();

  return (
    <div className="max-w-3xl mx-auto flex flex-col grow space-y-8 py-8">
      {settingSubType === 'mixpanel' && <MixpanelIntegration />}
      {settingSubType === 'posthog' && <PostHogIntegration />}
      {settingSubType === 'amplitude' && <AmplitudeIntegration />}
      {settingSubType === 'heap' && <HeapIntegration />}
      {settingSubType === 'hubspot' && <HubSpotIntegration />}
      {settingSubType === 'segment' && <SegmentIntegration />}
      {settingSubType === 'salesforce' && <SalesforceIntegration provider="salesforce" />}
      {settingSubType === 'salesforce-sandbox' && (
        <SalesforceIntegration provider="salesforce-sandbox" />
      )}
    </div>
  );
};

IntegrationDetail.displayName = 'IntegrationDetail';
