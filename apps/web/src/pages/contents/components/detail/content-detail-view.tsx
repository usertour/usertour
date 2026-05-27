import { ContentLoading } from '@usertour/ui';
import {
  ContentDetailProviderWrapper,
  useContentDetailProviderWrapper,
} from '@/contexts/content-detail-provider';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { ContentTypeName } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { ContentDetailAnalytics } from '../version/content-detail-analytics';
import { ContentDetailVersion } from '../version/content-detail-version';
import { ContentLocalizationList } from '../version/content-localization-list';
import { ContentDetailContent } from './content-detail-content';
import { ContentDetailHeader } from './content-detail-header';
import { ContentDetailNotFound } from './content-detail-not-found';
import { ContentDetailSettings } from './content-detail-settings';
import { ContentDetailTrackerEditor } from './content-detail-tracker-editor';

export interface ContentDetailViewProps {
  contentId: string;
  type: string;
  contentType: ContentTypeName;
}

// Inner component that uses the provider context
const ContentDetailViewInner = (props: ContentDetailViewProps) => {
  const { type, contentId, contentType } = props;
  const { isLoading } = useContentDetailProviderWrapper();
  const { content } = useContentDetailContext();
  const { t } = useTranslation();

  if (isLoading) {
    return <ContentLoading message={t('common.loading')} />;
  }

  // Server returns null for soft-deleted (or otherwise inaccessible) content.
  // Header + body sub-components all assume a Content object and silently
  // collapse to blank without it, so short-circuit with an explicit empty
  // state instead.
  if (!content) {
    return <ContentDetailNotFound contentType={contentType} />;
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
};

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
