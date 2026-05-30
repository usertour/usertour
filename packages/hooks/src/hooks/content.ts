import { type QueryHookOptions, useMutation, useQuery } from '@apollo/client';
import {
  createContent,
  duplicateContent,
  findManyVersionLocations,
  getContent,
  getContentVersion,
  listContentVersions,
  publishedContentVersion,
  queryContent,
  restoreContentVersion,
  unpublishedContentVersion,
} from '@usertour/gql';
import type {
  Content,
  ContentDataType,
  ContentVersion,
  VersionOnLocalization,
} from '@usertour/types';
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

// ---- queryContent: cursor pagination with fetchMore + accumulator ----
//
// `useContentListQuery` (in `gql.ts`) still exists for builder /
// resource-center consumers that fetch a one-shot bounded slice
// (`first: 100/1000`). This wrapper is the infinite-scroll shape —
// callers (the apps/web content list page) trigger `fetchNextPage`
// from an in-view sentinel and Apollo's `updateQuery` appends the new
// edges into the same cache slot so the rendered grid grows.

const CONTENT_LIST_PAGE_SIZE = 30;

// Module-level so the default `orderBy` is referentially stable across
// renders — folded into `useCallback` deps without churning
// `fetchNextPage`'s identity.
const DEFAULT_CONTENT_ORDER_BY = { field: 'createdAt', direction: 'desc' } as const;

interface QueryContentVariables {
  environmentId: string;
  type?: ContentDataType;
  published?: boolean;
  [key: string]: unknown;
}

type ContentEdge = { cursor: string; node: Content };
type ContentPageInfo = { endCursor: string | null; hasNextPage: boolean };
type QueryContentData = {
  queryContent: {
    totalCount: number;
    edges: ContentEdge[];
    pageInfo: ContentPageInfo;
  };
};

interface UseListContentsArgs {
  query: QueryContentVariables;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  pageSize?: number;
  options?: QueryHookOptions;
}

export const useListContentsQuery = ({
  query,
  orderBy = DEFAULT_CONTENT_ORDER_BY,
  pageSize = CONTENT_LIST_PAGE_SIZE,
  options,
}: UseListContentsArgs) => {
  const { data, loading, networkStatus, fetchMore, refetch } = useQuery<QueryContentData>(
    queryContent,
    {
      variables: { first: pageSize, query, orderBy },
      notifyOnNetworkStatusChange: true,
      ...options,
    },
  );

  const connection = data?.queryContent;
  const contents = useMemo(
    () => connection?.edges?.map((edge) => edge.node) ?? [],
    [connection?.edges],
  );
  const totalCount = connection?.totalCount ?? 0;
  const hasNextPage = connection?.pageInfo?.hasNextPage ?? false;
  const endCursor = connection?.pageInfo?.endCursor ?? null;

  const loadingMore = networkStatus === 3;
  const fetchingRef = useRef(false);

  const fetchNextPage = useCallback(async () => {
    if (!hasNextPage || loading || fetchingRef.current || !endCursor) {
      return;
    }
    fetchingRef.current = true;
    try {
      await fetchMore({
        variables: { first: pageSize, after: endCursor, query, orderBy },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) {
            return prev;
          }
          return {
            queryContent: {
              ...fetchMoreResult.queryContent,
              edges: [
                ...(prev.queryContent?.edges ?? []),
                ...(fetchMoreResult.queryContent?.edges ?? []),
              ],
            },
          };
        },
      });
    } finally {
      fetchingRef.current = false;
    }
  }, [endCursor, fetchMore, hasNextPage, loading, pageSize, query, orderBy]);

  return {
    contents,
    totalCount,
    hasNextPage,
    loading: loading && !loadingMore,
    loadingMore,
    fetchNextPage,
    refetch,
  };
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
      // The cache-level merge is owned by the typePolicy on
      // `Query.listContentVersions` (apps/web/src/apollo/type-policies),
      // which also guards against per-row `cache-and-network` mounts
      // overwriting the accumulator. No `updateQuery` here.
      await fetchMore({
        variables: { contentId, first: VERSION_LIST_PAGE_SIZE, after: endCursor },
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

// ---- mutations ----

export interface CreateContentInput {
  type: string;
  name: string;
  environmentId: string;
  buildUrl?: string;
  data?: unknown;
  steps?: unknown[];
}

export const useCreateContentMutation = () => {
  // Refresh the list so the new row appears — Apollo can't materialise
  // a new edge from a mutation response.
  const [mutation, { loading, error }] = useMutation(createContent, {
    refetchQueries: ['queryContent'],
  });
  const invoke = async (input: CreateContentInput): Promise<Content | undefined> => {
    const response = await mutation({ variables: input });
    return response.data?.createContent as Content | undefined;
  };
  return { invoke, loading, error };
};

export interface DuplicateContentInput {
  contentId: string;
  name: string;
  targetEnvironmentId?: string;
}

export const useDuplicateContentMutation = () => {
  const [mutation, { loading, error }] = useMutation(duplicateContent, {
    refetchQueries: ['queryContent'],
  });
  const invoke = async (
    input: DuplicateContentInput,
  ): Promise<{ id: string; name: string } | undefined> => {
    const response = await mutation({ variables: input });
    return response.data?.duplicateContent;
  };
  return { invoke, loading, error };
};

export const usePublishContentVersionMutation = () => {
  // Publish flips `Content.contentOnEnvironments[].published` —
  // refetch the owning content so list cell + detail header reflect
  // the new state.
  const [mutation, { loading, error }] = useMutation(publishedContentVersion, {
    refetchQueries: ['getContent', 'queryContent'],
  });
  const invoke = async (versionId: string, environmentId: string): Promise<boolean> => {
    const response = await mutation({ variables: { versionId, environmentId } });
    return !!response.data?.publishedContentVersion?.id;
  };
  return { invoke, loading, error };
};

export const useUnpublishContentVersionMutation = () => {
  const [mutation, { loading, error }] = useMutation(unpublishedContentVersion, {
    refetchQueries: ['getContent', 'queryContent'],
  });
  const invoke = async (contentId: string, environmentId: string): Promise<boolean> => {
    const response = await mutation({ variables: { contentId, environmentId } });
    return !!response.data?.unpublishedContentVersion?.success;
  };
  return { invoke, loading, error };
};

export const useRestoreContentVersionMutation = () => {
  // Restore creates a new editable version + flips
  // `Content.editedVersionId` — refresh both the content and the
  // version-history list so the restored draft surfaces immediately.
  const [mutation, { loading, error }] = useMutation(restoreContentVersion, {
    refetchQueries: ['getContent', 'listContentVersions'],
  });
  const invoke = async (versionId: string): Promise<boolean> => {
    const response = await mutation({ variables: { versionId } });
    return !!response.data?.restoreContentVersion?.id;
  };
  return { invoke, loading, error };
};
