import { useParams } from 'react-router-dom';
import { MixpanelIntegration } from './mixpanel';
import { PosthogIntegration } from './posthog';
import { AmplitudeIntegration } from './amplitude';
import { HeapIntegration } from './heap';
import { HubSpotIntegration } from './hubspot';
import { SegmentIntegration } from './segment';

export const IntegrationDetail = () => {
  const { settingSubType } = useParams();

  return (
    <div className="max-w-3xl mx-auto flex flex-col grow space-y-8 py-8">
      {settingSubType === 'mixpanel' && <MixpanelIntegration />}
      {settingSubType === 'posthog' && <PosthogIntegration />}
      {settingSubType === 'amplitude' && <AmplitudeIntegration />}
      {settingSubType === 'heap' && <HeapIntegration />}
      {settingSubType === 'hubspot' && <HubSpotIntegration />}
      {settingSubType === 'segment' && <SegmentIntegration />}
    </div>
  );
};

IntegrationDetail.displayName = 'IntegrationDetail';
