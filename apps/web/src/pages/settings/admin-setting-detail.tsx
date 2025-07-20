import { useParams } from 'react-router-dom';
import { IntegrationDetail } from './integrations/components/integration-detail';

export const AdminSettingsDetail = () => {
  const { settingType } = useParams();

  if (settingType === 'integrations') {
    return <IntegrationDetail />;
  }
};

AdminSettingsDetail.displayName = 'AdminSettingsDetail';
