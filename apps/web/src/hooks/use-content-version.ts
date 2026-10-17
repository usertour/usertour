import { useGetContentVersionQuery } from '@usertour/data';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';

// Thin app-level wrapper. Replaces the data half of the old
// `useContentVersionContext`; `isSaving` (UI state) lives in
// `ContentDetailUIContext`.
export const useContentVersion = (versionId: string | null | undefined) =>
  useGetContentVersionQuery(versionId, SHARED_CACHE_QUERY_OPTIONS);
