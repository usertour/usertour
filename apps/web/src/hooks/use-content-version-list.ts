import { useListContentVersionsQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';

// Thin app-level wrapper. The underlying packages/hooks query handles
// cursor pagination via fetchMore + a fetchingRef dedup; the wrapper
// only adds cache participation.
export const useContentVersionList = (contentId: string | undefined) =>
  useListContentVersionsQuery(contentId, SHARED_CACHE_QUERY_OPTIONS);
