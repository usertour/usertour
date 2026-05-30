import { useListContentsQuery } from '@usertour/hooks';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { getQueryType } from '@/utils/content';

// Replaces `ContentListProvider`. Infinite-scroll shape: callers
// consume `contents` + `fetchNextPage` and trigger more pages from an
// in-view sentinel rather than a paginator. `published` is read
// directly from the URL — sidebar dispatches via `setSearchParams`, the
// hook re-reads here, no separate store.
//
// `SHARED_CACHE_QUERY_OPTIONS` is baked in so the page-tree consumers
// dedupe via Apollo's cache slot.
//
// `query` is memoised on the primitives so its reference only changes
// when env / contentType / published actually change. Without this,
// every render of the list page produces a fresh `query` object,
// which propagates through `useListContentsQuery`'s `useCallback` deps
// and rebuilds `fetchNextPage` — that in turn makes the data-table's
// in-view effect re-fire and chain extra pages while the sentinel
// hasn't moved out of view.
export const useContentList = (environmentId: string | undefined, contentType: string) => {
  const [searchParams] = useSearchParams();
  const published = searchParams.get('published') === '1';

  const query = useMemo(
    () => ({
      environmentId: environmentId ?? '',
      type: getQueryType(contentType),
      published,
    }),
    [environmentId, contentType, published],
  );

  return useListContentsQuery({
    query,
    options: { ...SHARED_CACHE_QUERY_OPTIONS, skip: !environmentId },
  });
};
