import { ContentLoading } from '@usertour/ui';
import { useAppContext } from '@/contexts/app-context';
import { ContentDetailUIProvider } from '@/contexts/content-detail-ui-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { useContentVersion } from '@/hooks/use-content-version';
import { useContentVersionList } from '@/hooks/use-content-version-list';
import { useSegmentList } from '@/hooks/use-segment-list';
import { useThemeList } from '@/hooks/use-theme-list';
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

// bizType filter for the segment hook. Module-level constant keeps
// the reference stable across renders so `useSegmentList`'s `useMemo`
// deps don't re-compute the filtered list every paint.
const SEGMENT_BIZ_TYPES: readonly string[] = ['COMPANY', 'USER'];

// Inner component that pulls server data via hooks. Replaces the
// previous `ContentDetailProviderWrapper` + `useContentDetailProviderWrapper`
// shape — the aggregator was just composing six Providers and
// summing their loading flags, which is what `useContentDetail` /
// `useContentVersion` / `useContentVersionList` plus the existing
// list-context loadings now do directly. Cleaner, and removes the
// latent "themeListLoading kicks first-load blank-gate" footgun.
const ContentDetailViewInner = (props: ContentDetailViewProps) => {
  const { type, contentId, contentType } = props;
  const { environment } = useAppContext();
  const { content, loading: contentLoading } = useContentDetail(contentId);
  const { version, loading: versionLoading } = useContentVersion(content?.editedVersionId);
  const { versionList, loading: versionListLoading } = useContentVersionList(contentId);
  const { loading: themeLoading } = useThemeList();
  const { loading: segmentLoading } = useSegmentList(environment?.id, SEGMENT_BIZ_TYPES);
  const { t } = useTranslation();

  // First-load gating — `loading && !data` so background refetches
  // (e.g. theme list refetch after a setting change) don't unmount
  // the entire detail tree. Same lesson as the v0.8.4 builder fix.
  const isLoading =
    (contentLoading && !content) ||
    (versionLoading && !version) ||
    (versionListLoading && versionList.length === 0) ||
    themeLoading ||
    segmentLoading;

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

  // Theme / segment / event lists are all hook-based now — Apollo
  // shared-cache makes them dedupe across the subtree without a
  // Provider hop.
  return (
    <ContentDetailUIProvider contentId={contentId} contentType={contentType}>
      <ContentDetailViewInner {...props} />
    </ContentDetailUIProvider>
  );
};

ContentDetailView.displayName = 'ContentDetailView';
