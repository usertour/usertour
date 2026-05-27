import { ContentLoading } from '@usertour/ui';
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
    // AdminShellMuted's content card uses `flex h-full w-full` (default
    // flex-row) for its inner sidebar-wrapper. Without an explicit flex-col
    // here, header + route content would sit side-by-side instead of stacked.
    <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
      <ContentDetailHeader />
      {type === 'detail' && contentType === ContentTypeName.TRACKERS && (
        <div className="px-6 py-8 xl:px-8">
          <ContentDetailTrackerEditor />
        </div>
      )}
      {type === 'detail' && contentType !== ContentTypeName.TRACKERS && (
        <div className="px-6 py-8 xl:px-8">
          <div className="flex flex-row space-x-8 justify-center max-w-screen-xl mx-auto">
            <ContentDetailSettings />
            <ContentDetailContent />
          </div>
        </div>
      )}
      {type === 'versions' && <ContentDetailVersion />}
      {type === 'analytics' && <ContentDetailAnalytics contentId={contentId} />}
      {type === 'localization' && <ContentLocalizationList />}
    </div>
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
