import { type QueryHookOptions, useQuery } from '@apollo/client';
import {
  findManyVersionLocations,
  getContent,
  getContentVersion,
  listContentVersions,
} from '@usertour/gql';
import type { Content, ContentVersion, VersionOnLocalization } from '@usertour/types';
import { useCallback, useMemo, useRef } from 'react';

// Domain wrappers for content-detail / version / localization queries.
// Lives outside the catch-all `gql.ts` per the convention established
// by `themes.ts` / `access-tokens.ts` etc.
//
// All wrappers stay fetchPolicy-agnostic — callers (typically apps/web)
// pass `SHARED_CACHE_QUERY_OPTIONS` when they want cache participation.
// The wrappers map `data?.<field>` into the nicely-named return shape
// so call sites read like business code, not GraphQL.

export const useGetContentQuery = (contentId: string | undefined, options?: QueryHookOptions) => {
  const { data, loading, refetch, error } = useQuery(getContent, {
    variables: { contentId },
    skip: !contentId,
    ...options,
  });

  const content: Content | null = data?.getContent ?? null;

  return { content, loading, refetch, error };
};

export const useGetContentVersionQuery = (
  versionId: string | undefined,
  options?: QueryHookOptions,
) => {
  const { data, loading, refetch, error } = useQuery(getContentVersion, {
    variables: { versionId },
    skip: !versionId,
    ...options,
  });

  const version: ContentVersion | null = data?.getContentVersion ?? null;

  return { version, loading, refetch, error };
};

export const useFindManyVersionLocationsQuery = (
  versionId: string | undefined,
  options?: QueryHookOptions,
) => {
  const { data, loading, refetch, error } = useQuery(findManyVersionLocations, {
    variables: { versionId },
    skip: !versionId,
    ...options,
  });

  const contentLocalizationList: VersionOnLocalization[] = data?.findManyVersionLocations ?? [];

  return { contentLocalizationList, loading, refetch, error };
};

// ---- listContentVersions: cursor pagination with fetchMore ----

const VERSION_LIST_PAGE_SIZE = 20;

type VersionEdge = { cursor: string; node: ContentVersion };
type VersionPageInfo = { endCursor: string | null; hasNextPage: boolean };
type ListContentVersionsData = {
  listContentVersions: {
    totalCount: number;
    edges: VersionEdge[];
    pageInfo: VersionPageInfo;
  };
};

export const useListContentVersionsQuery = (
  contentId: string | undefined,
  options?: QueryHookOptions,
) => {
  const { data, loading, networkStatus, fetchMore, refetch } = useQuery<ListContentVersionsData>(
    listContentVersions,
    {
      variables: { contentId, first: VERSION_LIST_PAGE_SIZE },
      notifyOnNetworkStatusChange: true,
      skip: !contentId,
      ...options,
    },
  );

  const connection = data?.listContentVersions;
  const versionList = useMemo(
    () => connection?.edges?.map((edge) => edge.node) ?? [],
    [connection?.edges],
  );
  const hasNextPage = connection?.pageInfo?.hasNextPage ?? false;
  const endCursor = connection?.pageInfo?.endCursor ?? null;
  const totalCount = connection?.totalCount ?? 0;

  // networkStatus === 3 is NetworkStatus.fetchMore. Keep `loading`
  // clean ("first load only") so consumers don't collapse the rendered
  // list while a page is appending — the v0.8.4 lesson applied to
  // fetchMore.
  const loadingMore = networkStatus === 3;
  const fetchingRef = useRef(false);

  const fetchNextPage = useCallback(async () => {
    if (!hasNextPage || loading || fetchingRef.current || !endCursor) {
      return;
    }
    fetchingRef.current = true;
    try {
      await fetchMore({
        variables: { contentId, first: VERSION_LIST_PAGE_SIZE, after: endCursor },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) {
            return prev;
          }
          return {
            listContentVersions: {
              ...fetchMoreResult.listContentVersions,
              edges: [
                ...(prev.listContentVersions?.edges ?? []),
                ...(fetchMoreResult.listContentVersions?.edges ?? []),
              ],
            },
          };
        },
      });
    } finally {
      fetchingRef.current = false;
    }
  }, [contentId, endCursor, fetchMore, hasNextPage, loading]);

  return {
    versionList,
    totalCount,
    hasNextPage,
    loading: loading && !loadingMore,
    loadingMore,
    fetchNextPage,
    refetch,
  };
};
