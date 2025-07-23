import {
  ContentDetailProviderWrapper,
  useContentDetailProviderWrapper,
} from '@/contexts/content-detail-provider';
import { ContentLoading } from '@/components/molecules/content-loading';
import { ContentTypeName } from '@usertour-packages/types';
import { ContentDetailContent } from '../components/detail/content-detail-content';
import { ContentDetailHeader } from '../components/detail/content-detail-header';
import { ContentDetailSettings } from '../components/detail/content-detail-settings';
import { ContentDetailAnalytics } from '../components/version/content-detail-analytics';
import { ContentDetailVersion } from '../components/version/content-detail-version';
import { ContentLocalizationList } from '../components/version/content-localization-list';

export const LauncherDetailContent = () => {
  return (
    <div className="p-14 mt-12 ">
      <div className="flex flex-row space-x-8 justify-center max-w-screen-xl mx-auto">
        <ContentDetailSettings />
        <ContentDetailContent />
      </div>
    </div>
  );
};

LauncherDetailContent.displayName = 'LauncherDetailContent';

interface LauncherDetailProps {
  contentId: string;
  type: string;
}

// Inner component that uses the provider context
function LauncherDetailContentWrapper(props: LauncherDetailProps) {
  const { type, contentId } = props;
  const { isLoading } = useContentDetailProviderWrapper();

  if (isLoading) {
    return <ContentLoading message="Loading launcher details..." />;
  }

  return (
    <>
      <ContentDetailHeader />
      {type === 'detail' && <LauncherDetailContent />}
      {type === 'versions' && <ContentDetailVersion />}
      {type === 'analytics' && <ContentDetailAnalytics contentId={contentId} />}
      {type === 'localization' && <ContentLocalizationList />}
    </>
  );
}

export const LauncherDetail = (props: LauncherDetailProps) => {
  const { contentId } = props;

  return (
    <ContentDetailProviderWrapper contentId={contentId} contentType={ContentTypeName.LAUNCHERS}>
      <LauncherDetailContentWrapper {...props} />
    </ContentDetailProviderWrapper>
  );
};

LauncherDetail.displayName = 'LauncherDetail';
