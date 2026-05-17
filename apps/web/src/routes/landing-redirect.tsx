import { Navigate } from 'react-router-dom';
import { storage } from '@usertour/helpers';
import { StorageKeys } from '@usertour/constants';
import { useAppContext } from '@/contexts/app-context';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { FullPageSpinner } from './full-page-spinner';

// Default landing for "/" when the user is logged in.
// Order: in-memory context env > last-used env from localStorage > primary env > first env.
export const LandingRedirect = () => {
  const { environment, userInfo } = useAppContext();
  const { environmentList, loading } = useEnvironmentListContext();

  if (environment?.id) {
    return <Navigate to={`/env/${environment.id}/flows`} replace />;
  }

  if (loading || !environmentList) {
    return <FullPageSpinner />;
  }

  const storedId = userInfo?.id
    ? (storage.getLocalStorage(`${StorageKeys.ENVIRONMENT_ID}-${userInfo.id}`) as
        | string
        | undefined)
    : undefined;
  const stored = storedId ? environmentList.find((env) => env.id === storedId) : undefined;
  const primary = environmentList.find((env) => env.isPrimary === true);
  const fallback = environmentList[0];
  const target = stored ?? primary ?? fallback;

  if (!target?.id) {
    return <FullPageSpinner />;
  }

  return <Navigate to={`/env/${target.id}/flows`} replace />;
};

LandingRedirect.displayName = 'LandingRedirect';
