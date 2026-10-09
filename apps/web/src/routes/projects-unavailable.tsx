import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingButton } from '@usertour/ui';
import { useAppContext } from '@/contexts/app-context';
import { AuthCard } from '@/pages/authentication/components/auth-card';
import { AuthBackdrop } from '@/pages/layouts/auth';

export interface ProjectsUnavailableProps {
  /**
   * Draw the auth backdrop around the card. The admin shell passes it, since
   * the shell cannot draw without a project and this card stands in for it;
   * pages already under the auth layout leave it out.
   */
  backdrop?: boolean;
}

// Shown when the server could not report the user's projects: the `projects`
// field of `me` failed while the user itself resolved. Unknown is not none —
// nothing here redirects, and nothing offers to create a project.
export const ProjectsUnavailable = (props: ProjectsUnavailableProps) => {
  const { backdrop = false } = props;
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

  const card = (
    <AuthCard
      title={t('appError.projects.title')}
      description={t('appError.projects.description')}
      footer={
        <LoadingButton type="button" className="w-full" loading={retrying} onClick={retry}>
          {t('appError.projects.retry')}
        </LoadingButton>
      }
    />
  );

  return backdrop ? <AuthBackdrop>{card}</AuthBackdrop> : card;
};

ProjectsUnavailable.displayName = 'ProjectsUnavailable';
