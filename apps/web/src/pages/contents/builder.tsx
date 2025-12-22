import { useAppContext } from '@/contexts/app-context';
import { useParams, useSearchParams } from 'react-router-dom';
import { ContentDetailBuilder } from './components/detail/content-detail-builder';
import { ContentLoading } from '@/components/molecules/content-loading';

export const ContentBuilder = () => {
  const { contentId = '', contentType, versionId } = useParams();
  const [searchParams] = useSearchParams();
  const { project, environment } = useAppContext();

  if (!project || !project.id || !contentId || !versionId || !environment || !contentType) {
    return <ContentLoading message="Loading builder..." />;
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
