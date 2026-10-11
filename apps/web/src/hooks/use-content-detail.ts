import { useGetContentQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';

// Thin app-level wrapper that bakes in cache participation so the ~23
// call sites under the content-detail page tree share one Apollo
// observable. Replaces the old `useContentDetailContext` data half;
// `contentType` (UI state) moves to `ContentDetailUIContext`.
export interface UseContentDetailOptions {
  /** `false` for the one caller that draws the failure itself (ADR 0021 §5). */
  notifyOnError?: boolean;
}

export const useContentDetail = (
  contentId: string | undefined,
  options?: UseContentDetailOptions,
) => useGetContentQuery(contentId, { ...SHARED_CACHE_QUERY_OPTIONS, ...options });
