import { useTranslation } from 'react-i18next';
import { Unavailable } from '@/components/unavailable';
import { useAppContext } from '@/contexts/app-context';

export interface ProjectsUnavailableProps {
  /** Draw the auth backdrop around the card; the admin shell passes it, pages under the auth layout leave it out. */
  backdrop?: boolean;
}

// Shown when the server could not report the user's projects: the `projects`
// field of `me` failed while the user itself resolved.
export const ProjectsUnavailable = (props: ProjectsUnavailableProps) => {
  const { backdrop = false } = props;
  const { t } = useTranslation('ui');
  const { refetch } = useAppContext();
  return (
    <Unavailable
      title={t('appError.projects.title')}
      description={t('appError.projects.description')}
      onRetry={refetch}
      backdrop={backdrop}
    />
  );
};

ProjectsUnavailable.displayName = 'ProjectsUnavailable';
