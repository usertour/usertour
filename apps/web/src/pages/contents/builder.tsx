import { useAppContext } from '@/contexts/app-context';
import { useParams } from 'react-router-dom';
import { ContentDetailBuilder } from './components/detail/content-detail-builder';
import { ContentLoading } from '@/components/molecules/content-loading';

export const ContentBuilder = () => {
  const { contentId = '', contentType, versionId } = useParams();
  const { project, environment } = useAppContext();
  if (!project || !project.id || !contentId || !versionId || !environment || !contentType) {
    return <ContentLoading message="Loading builder..." />;
  }

  return (
    <>
      <ContentDetailBuilder
        contentId={contentId}
        versionId={versionId}
        projectId={project?.id}
        environmentId={environment.id}
        envToken={environment.token}
        contentType={contentType}
      />
    </>
  );
};

ContentBuilder.displayName = 'ContentBuilder';
