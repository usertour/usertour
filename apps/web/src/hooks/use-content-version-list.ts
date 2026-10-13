import { useListContentVersionsQuery } from '@usertour/data';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';

// Thin app-level wrapper. The underlying packages/data query handles
// cursor pagination via fetchMore + a fetchingRef dedup; the wrapper
// only adds cache participation.
export const useContentVersionList = (contentId: string | undefined) =>
  useListContentVersionsQuery(contentId, SHARED_CACHE_QUERY_OPTIONS);
