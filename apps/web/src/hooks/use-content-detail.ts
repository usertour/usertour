import { useGetContentQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';

// Thin app-level wrapper that bakes in cache participation so the ~23
// call sites under the content-detail page tree share one Apollo
// observable. Replaces the old `useContentDetailContext` data half;
// `contentType` (UI state) moves to `ContentDetailUIContext`.
export const useContentDetail = (contentId: string | undefined) =>
  useGetContentQuery(contentId, SHARED_CACHE_QUERY_OPTIONS);
