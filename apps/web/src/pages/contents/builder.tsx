import { useAppContext } from '@/contexts/app-context';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ContentDetailBuilder } from './components/detail/content-detail-builder';
import { ContentLoading } from '@usertour/ui';

export const ContentBuilder = () => {
  const { contentId = '', contentType, versionId } = useParams();
  const { project, environment } = useAppContext();
  const { t } = useTranslation();

  if (!project || !project.id || !contentId || !versionId || !environment || !contentType) {
    return <ContentLoading message={t('common.loading')} className="min-h-screen" />;
  }

  return (
    <ContentDetailBuilder
      contentId={contentId}
      versionId={versionId}
      projectId={project.id}
      environmentId={environment.id}
      envToken={environment.token}
      contentType={contentType}
    />
  );
};

ContentBuilder.displayName = 'ContentBuilder';
