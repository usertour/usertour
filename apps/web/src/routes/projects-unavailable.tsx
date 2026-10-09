import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingButton } from '@usertour/ui';
import { useAppContext } from '@/contexts/app-context';

// Shown when the server could not report the user's projects: the `projects`
// field of `me` failed while the user itself resolved. Unknown is not none —
// nothing here redirects, and nothing offers to create a project.
export const ProjectsUnavailable = () => {
  const { t } = useTranslation('ui');
  const { refetch } = useAppContext();
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    try {
      await refetch();
    } catch {
      // The query state carries the outcome; a failed retry leaves this view up.
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm text-muted-foreground">{t('appError.projects.description')}</p>
      <LoadingButton type="button" loading={retrying} onClick={retry}>
        {t('appError.projects.retry')}
      </LoadingButton>
    </div>
  );
};

ProjectsUnavailable.displayName = 'ProjectsUnavailable';
