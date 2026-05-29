import { useGetContentVersionQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';

// Thin app-level wrapper. Replaces the data half of the old
// `useContentVersionContext`; `isSaving` (UI state) lives in
// `ContentDetailUIContext`.
export const useContentVersion = (versionId: string | undefined) =>
  useGetContentVersionQuery(versionId, SHARED_CACHE_QUERY_OPTIONS);
