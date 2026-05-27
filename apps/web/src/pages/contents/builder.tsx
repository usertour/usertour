import { useAppContext } from '@/contexts/app-context';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ContentDetailBuilder } from './components/detail/content-detail-builder';
import { ContentLoading } from '@usertour/ui';

export const ContentBuilder = () => {
  const { contentId = '', contentType, versionId } = useParams();
  const [searchParams] = useSearchParams();
  const { project, environment } = useAppContext();
  const { t } = useTranslation();

  if (!project || !project.id || !contentId || !versionId || !environment || !contentType) {
    return <ContentLoading message={t('common.loading')} />;
  }

  const stepParam = searchParams.get('step');
  const initialStepIndex = stepParam !== null ? Number.parseInt(stepParam, 10) : undefined;

  return (
    <>
      <ContentDetailBuilder
        contentId={contentId}
        versionId={versionId}
        projectId={project?.id}
        environmentId={environment.id}
        envToken={environment.token}
        contentType={contentType}
        initialStepIndex={initialStepIndex}
      />
    </>
  );
};

ContentBuilder.displayName = 'ContentBuilder';
