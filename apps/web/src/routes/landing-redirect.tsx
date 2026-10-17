import { Navigate } from 'react-router-dom';
import { storage } from '@usertour/helpers';
import { StorageKeys } from '@usertour/constants';
import { useAppContext } from '@/contexts/app-context';
import { useTranslation } from 'react-i18next';
import { Unavailable } from '@/components/unavailable';
import { useEnvironmentList } from '@/hooks/use-environment-list';
import { FullPageSpinner } from './full-page-spinner';

// Default landing for "/" when the user is logged in.
// Order: in-memory context env > last-used env from localStorage > primary env > first env.
export const LandingRedirect = () => {
  const { environment, userInfo } = useAppContext();
  // The failure is drawn below. This is the index route, outside the shell:
  // the list's other observers (the env switcher, the pages) are not mounted
  // here, so nothing else announces it.
  const { environmentList, loading, error, refetch } = useEnvironmentList({ notifyOnError: false });
  const { t } = useTranslation('ui');

  if (environment?.id) {
    return <Navigate to={`/env/${environment.id}/flows`} replace />;
  }

  // The environment list decides where the app lands; without it there is
  // nowhere to go, and a spinner that never resolves is not an answer.
  if (error && !environmentList) {
    return (
      <Unavailable
        frame="backdrop"
        title={t('appError.environments.title')}
        description={t('appError.environments.description')}
        onRetry={refetch}
      />
    );
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
