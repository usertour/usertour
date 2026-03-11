import { ContentDetailView } from './components/detail/content-detail-view';
import { ContentTypeName } from '@usertour/types';
import { useParams } from 'react-router-dom';

const SUPPORTED_CONTENT_TYPES = [
  ContentTypeName.FLOWS,
  ContentTypeName.LAUNCHERS,
  ContentTypeName.CHECKLISTS,
  ContentTypeName.BANNERS,
  ContentTypeName.TRACKERS,
] as const;

export const ContentDetail = () => {
  const { contentId = '', contentType, type } = useParams();

  if (!contentId || !type) {
    return <></>;
  }

  if (
    !contentType ||
    !SUPPORTED_CONTENT_TYPES.includes(contentType as (typeof SUPPORTED_CONTENT_TYPES)[number])
  ) {
    return <></>;
  }

  return (
    <ContentDetailView
      contentId={contentId}
      type={type}
      contentType={contentType as ContentTypeName}
    />
  );
};

ContentDetail.displayName = 'ContentDetail';
