import { ContentLoading } from '@/components/molecules/content-loading';
import {
  ContentDetailProviderWrapper,
  useContentDetailProviderWrapper,
} from '@/contexts/content-detail-provider';
import { ContentTypeName } from '@usertour/types';
import { ContentDetailAnalytics } from '../version/content-detail-analytics';
import { ContentDetailVersion } from '../version/content-detail-version';
import { ContentLocalizationList } from '../version/content-localization-list';
import { ContentDetailContent } from './content-detail-content';
import { ContentDetailHeader } from './content-detail-header';
import { ContentDetailSettings } from './content-detail-settings';
import { ContentDetailTrackerEditor } from './content-detail-tracker-editor';

const CONTENT_TYPE_LOADING_MESSAGES: Record<ContentTypeName, string> = {
  [ContentTypeName.FLOWS]: 'Loading flow details...',
  [ContentTypeName.LAUNCHERS]: 'Loading launcher details...',
  [ContentTypeName.CHECKLISTS]: 'Loading checklist details...',
  [ContentTypeName.BANNERS]: 'Loading banner details...',
  [ContentTypeName.TRACKERS]: 'Loading content details...',
  [ContentTypeName.RESOURCE_CENTERS]: 'Loading resource center details...',
};

function getContentTypeDetailLoadingMessage(contentType: ContentTypeName): string {
  return CONTENT_TYPE_LOADING_MESSAGES[contentType] ?? 'Loading content details...';
}

export interface ContentDetailViewProps {
  contentId: string;
  type: string;
  contentType: ContentTypeName;
}

// Inner component that uses the provider context
function ContentDetailViewInner(props: ContentDetailViewProps) {
  const { type, contentId, contentType } = props;
  const { isLoading } = useContentDetailProviderWrapper();

  if (isLoading) {
    return <ContentLoading message={getContentTypeDetailLoadingMessage(contentType)} />;
  }

  return (
    <>
      <ContentDetailHeader />
      {type === 'detail' && contentType === ContentTypeName.TRACKERS && (
        <div className="p-14 mt-12">
          <ContentDetailTrackerEditor />
        </div>
      )}
      {type === 'detail' && contentType !== ContentTypeName.TRACKERS && (
        <div className="p-14 mt-12 ">
          <div className="flex flex-row space-x-8 justify-center max-w-screen-xl mx-auto">
            <ContentDetailSettings />
            <ContentDetailContent />
          </div>
        </div>
      )}
      {type === 'versions' && <ContentDetailVersion />}
      {type === 'analytics' && <ContentDetailAnalytics contentId={contentId} />}
      {type === 'localization' && <ContentLocalizationList />}
    </>
  );
}

ContentDetailViewInner.displayName = 'ContentDetailViewInner';

export const ContentDetailView = (props: ContentDetailViewProps) => {
  const { contentId, contentType } = props;

  return (
    <ContentDetailProviderWrapper contentId={contentId} contentType={contentType}>
      <ContentDetailViewInner {...props} />
    </ContentDetailProviderWrapper>
  );
};

ContentDetailView.displayName = 'ContentDetailView';
