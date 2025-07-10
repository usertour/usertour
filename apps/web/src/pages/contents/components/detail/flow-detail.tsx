import {
  ContentDetailProviderWrapper,
  useContentDetailProviderWrapper,
} from '@/contexts/content-detail-provider';
import { ContentLoading } from '@/components/molecules/content-loading';
import { ContentDetailAnalytics } from '../version/content-detail-analytics';
import { ContentDetailVersion } from '../version/content-detail-version';
import { ContentLocalizationList } from '../version/content-localization-list';
import { ContentDetailContent } from './content-detail-content';
import { ContentDetailHeader } from './content-detail-header';
import { ContentDetailSettings } from './content-detail-settings';
import { ContentTypeName } from '@usertour-ui/types';

interface FlowDetailProps {
  contentId: string;
  type: string;
}

// Inner component that uses the provider context
function FlowDetailContent(props: FlowDetailProps) {
  const { type, contentId } = props;
  const { isLoading } = useContentDetailProviderWrapper();

  if (isLoading) {
    return <ContentLoading message="Loading flow details..." />;
  }

  return (
    <>
      <ContentDetailHeader />
      {type === 'detail' && (
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

export const FlowDetail = (props: FlowDetailProps) => {
  const { contentId } = props;

  return (
    <ContentDetailProviderWrapper contentId={contentId} contentType={ContentTypeName.FLOWS}>
      <FlowDetailContent {...props} />
    </ContentDetailProviderWrapper>
  );
};

FlowDetail.displayName = 'FlowDetail';
