import { useAppContext } from '@/contexts/app-context';
import { ContentDetailProvider } from '@/contexts/content-detail-context';
import { ContentVersionProvider } from '@/contexts/content-version-context';
import { ContentVersionListProvider } from '@/contexts/content-version-list-context';
import { LocalizationListProvider } from '@/contexts/localization-list-context';
import { useParams } from 'react-router-dom';
import { ContentDetailHeader } from './components/detail/content-detail-header';
import { ContentLocalizationDetail } from './components/version/content-localization-detail';

export const ContentLocalization = () => {
  const { contentId = '', contentType, locateCode } = useParams();
  const { project } = useAppContext();

  if (!contentId || !locateCode) {
    return <></>;
  }

  return (
    <>
      <ContentVersionListProvider contentId={contentId}>
        <ContentDetailProvider contentId={contentId} contentType={contentType}>
          <ContentVersionProvider>
            <LocalizationListProvider projectId={project?.id}>
              <ContentDetailHeader />
              <ContentLocalizationDetail locateCode={locateCode} />
            </LocalizationListProvider>
          </ContentVersionProvider>
        </ContentDetailProvider>
      </ContentVersionListProvider>
    </>
  );
};

ContentLocalization.displayName = 'ContentLocalization';
