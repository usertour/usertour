import { useParams } from 'react-router-dom';
import { MixpanelIntegration } from './mixpanel';

export const IntegrationDetail = () => {
  const { settingSubType } = useParams();

  return (
    <div className="flex flex-col grow space-y-8 py-8">
      {settingSubType === 'mixpanel' && <MixpanelIntegration />}
    </div>
  );
};

IntegrationDetail.displayName = 'IntegrationDetail';
