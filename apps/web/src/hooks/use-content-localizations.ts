import { useFindManyVersionLocationsQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';

// Thin app-level wrapper. Replaces `useContentLocalizationListContext`.
export const useContentLocalizations = (versionId: string | undefined) =>
  useFindManyVersionLocationsQuery(versionId, SHARED_CACHE_QUERY_OPTIONS);
