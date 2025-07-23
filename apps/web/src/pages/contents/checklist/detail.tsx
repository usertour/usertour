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

export const ChecklistDetailContent = () => {
  return (
    <div className="p-14 mt-12 ">
      <div className="flex flex-row space-x-8 justify-center max-w-screen-xl mx-auto">
        <ContentDetailSettings />
        <ContentDetailContent />
      </div>
    </div>
  );
};

ChecklistDetailContent.displayName = 'ChecklistDetailContent';

interface ChecklistDetailProps {
  contentId: string;
  type: string;
}

// Inner component that uses the provider context
function ChecklistDetailContentWrapper(props: ChecklistDetailProps) {
  const { type, contentId } = props;
  const { isLoading } = useContentDetailProviderWrapper();

  if (isLoading) {
    return <ContentLoading message="Loading checklist details..." />;
  }

  return (
    <>
      <ContentDetailHeader />
      {type === 'detail' && <ChecklistDetailContent />}
      {type === 'versions' && <ContentDetailVersion />}
      {type === 'analytics' && <ContentDetailAnalytics contentId={contentId} />}
      {type === 'localization' && <ContentLocalizationList />}
    </>
  );
}

export const ChecklistDetail = (props: ChecklistDetailProps) => {
  const { contentId } = props;

  return (
    <ContentDetailProviderWrapper contentId={contentId} contentType={ContentTypeName.CHECKLISTS}>
      <ChecklistDetailContentWrapper {...props} />
    </ContentDetailProviderWrapper>
  );
};

ChecklistDetail.displayName = 'ChecklistDetail';
