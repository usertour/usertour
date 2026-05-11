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
    <ContentVersionListProvider contentId={contentId}>
      <ContentDetailProvider contentId={contentId} contentType={contentType}>
        <ContentVersionProvider>
          <LocalizationListProvider projectId={project?.id}>
            {/* AdminSubpageLayout's content card uses `flex h-full w-full`
                (default flex-row) for its inner sidebar-wrapper, so the header
                + body need an explicit flex-col container or they end up
                side-by-side. Same fix as ContentDetailViewInner. */}
            <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
              <ContentDetailHeader />
              <ContentLocalizationDetail locateCode={locateCode} />
            </div>
          </LocalizationListProvider>
        </ContentVersionProvider>
      </ContentDetailProvider>
    </ContentVersionListProvider>
  );
};

ContentLocalization.displayName = 'ContentLocalization';
