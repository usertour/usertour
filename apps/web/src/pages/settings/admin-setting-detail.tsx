import { useAppContext } from '@/contexts/app-context';
import { Capability } from '@usertour/types';
import { Navigate, useParams } from 'react-router-dom';
import { IntegrationDetail } from './integrations/components/integration-detail';

export const AdminSettingsDetail = () => {
  const { settingType, projectId } = useParams();
  const { can, project, loading } = useAppContext();

  if (settingType === 'integrations') {
    // Defense-in-depth for direct URL access; redirect once capabilities are known.
    if (project && !loading && !can(Capability.IntegrationRead)) {
      return <Navigate to={`/project/${projectId}/settings/account`} replace />;
    }
    return <IntegrationDetail />;
  }
};

AdminSettingsDetail.displayName = 'AdminSettingsDetail';
