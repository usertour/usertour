import { useListContentsQuery } from '@usertour/hooks';
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
export const useContentList = (environmentId: string | undefined, contentType: string) => {
  const [searchParams] = useSearchParams();
  const published = searchParams.get('published') === '1';

  return useListContentsQuery({
    query: {
      environmentId: environmentId ?? '',
      type: getQueryType(contentType),
      published,
    },
    options: { ...SHARED_CACHE_QUERY_OPTIONS, skip: !environmentId },
  });
};
