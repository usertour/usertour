import { useParams } from 'react-router-dom';
import { MixpanelIntegration } from './mixpanel';

export const IntegrationDetail = () => {
  const { settingSubType } = useParams();

  if (settingSubType === 'mixpanel') {
    return <MixpanelIntegration />;
  }

  return <> </>;
};

IntegrationDetail.displayName = 'IntegrationDetail';
