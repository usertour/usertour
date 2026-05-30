import { ContentDetailView } from './components/detail/content-detail-view';
import { NotFound } from '@/routes/not-found';
import { ContentTypeName } from '@usertour/types';
import { useParams } from 'react-router-dom';

const SUPPORTED_CONTENT_TYPES = [
  ContentTypeName.FLOWS,
  ContentTypeName.LAUNCHERS,
  ContentTypeName.CHECKLISTS,
  ContentTypeName.BANNERS,
  ContentTypeName.TRACKERS,
  ContentTypeName.RESOURCE_CENTERS,
] as const;

export const ContentDetail = () => {
  // Route is `/env/:envId/:contentType/:contentId/:type` — React Router
  // guarantees the params if matched. The `||` chain falls back to
  // `<NotFound />` rather than asserting via throw: same effective
  // narrowing for the JSX below, but covers both the "unsupported
  // contentType in URL" 404 case and the "should-never-happen route
  // misconfig" case with one graceful UI.
  const { contentId, contentType, type } = useParams();
  if (
    !contentId ||
    !type ||
    !contentType ||
    !SUPPORTED_CONTENT_TYPES.includes(contentType as (typeof SUPPORTED_CONTENT_TYPES)[number])
  ) {
    return <NotFound />;
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
