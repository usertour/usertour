import { useMutation } from '@apollo/client';
import { type TypedQueryOptions, useTypedQuery } from '../query';

import type { Content, ContentVersion } from '@usertour/types';
import { useMemo } from 'react';
import { useCursorFetchMore } from './use-cursor-fetch-more';
import {
  type ContentOrder,
  type ContentQuery,
  CreateContentDocument,
  type CreateContentMutationVariables,
  DuplicateContentDocument,
  type DuplicateContentMutationVariables,
  GetContentDocument,
  type GetContentQuery,
  type GetContentQueryVariables,
  GetContentVersionDocument,
  type GetContentVersionQuery,
  type GetContentVersionQueryVariables,
  ListContentPublishRecordsDocument,
  type ListContentPublishRecordsQuery,
  type ListContentPublishRecordsQueryVariables,
  ListContentVersionsDocument,
  type ListContentVersionsQuery,
  type ListContentVersionsQueryVariables,
  ListVersionLocalizationsDocument,
  type ListVersionLocalizationsQuery,
  type ListVersionLocalizationsQueryVariables,
  PublishedContentVersionDocument,
  QueryContentDocument,
  type QueryContentQuery,
  type QueryContentQueryVariables,
  RestoreContentVersionDocument,
  UnpublishedContentVersionDocument,
} from '../graphql';

// Domain wrappers for content-detail / version / localization queries.
// Lives outside the catch-all `gql.ts` per the convention established
// by `themes.ts` / `access-tokens.ts` etc.
//
// All wrappers stay fetchPolicy-agnostic — callers (typically apps/web)
// pass `SHARED_CACHE_QUERY_OPTIONS` when they want cache participation.
// The wrappers map `data?.<field>` into the nicely-named return shape
// so call sites read like business code, not GraphQL.

export const useGetContentQuery = (
  contentId: string | undefined,
  options?: TypedQueryOptions<GetContentQuery, GetContentQueryVariables>,
) => {
  const { data, loading, refetch, error } = useTypedQuery(GetContentDocument, {
    variables: { contentId: contentId! },
    skip: !contentId,
    ...options,
  });

  const content: Content | null = data?.getContent ?? null;

  return { content, loading, refetch, error };
};

export const useGetContentVersionQuery = (
  versionId: string | null | undefined,
  options?: TypedQueryOptions<GetContentVersionQuery, GetContentVersionQueryVariables>,
) => {
  const { data, previousData, loading, refetch, error } = useTypedQuery(GetContentVersionDocument, {
    variables: { versionId: versionId! },
    skip: !versionId,
    ...options,
  });

  // When versionId flips (publish-then-edit forks a new editable version and
  // content.editedVersionId repoints to it), `data` is briefly undefined while
  // the new id loads. Hold the previous frame so consumers that gate on
  // `if (!version) return null` (detail's settings/content panels) don't unmount
  // and flash the whole content area. The forked version copies the prior
  // config, so the held-over frame is visually identical until the new one lands.
  const version: ContentVersion | null =
    data?.getContentVersion ?? previousData?.getContentVersion ?? null;

  return { version, loading, refetch, error };
};

export const useListVersionLocalizationsQuery = (
  versionId: string | null | undefined,
  options?: TypedQueryOptions<
    ListVersionLocalizationsQuery,
    ListVersionLocalizationsQueryVariables
  >,
) => {
  const { data, previousData, loading, refetch, error } = useTypedQuery(
    ListVersionLocalizationsDocument,
    {
      variables: { versionId: versionId! },
      skip: !versionId,
      ...options,
    },
  );

  // Fall back to the previous version's rows while a version switch loads —
  // same pattern as useGetContentVersionQuery above. Editing a published
  // version forks a draft whose rows are verbatim clones, and rendering an
  // empty list during the swap reads as every locale flipping to disabled.
  const contentLocalizationList = (data ?? previousData)?.listVersionLocalizations ?? [];

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

const CONTENT_LIST_PAGE_SIZE = 20;

// Module-level so the default `orderBy` is referentially stable across
// renders — folded into `useCallback` deps without churning
// `fetchNextPage`'s identity.
const DEFAULT_CONTENT_ORDER_BY = { field: 'createdAt', direction: 'desc' } as const;

interface UseListContentsArgs {
  query: ContentQuery;
  orderBy?: ContentOrder;
  pageSize?: number;
  options?: TypedQueryOptions<QueryContentQuery, QueryContentQueryVariables>;
}

export const useListContentsQuery = ({
  query,
  orderBy = DEFAULT_CONTENT_ORDER_BY,
  pageSize = CONTENT_LIST_PAGE_SIZE,
  options,
}: UseListContentsArgs) => {
  const { data, loading, refreshing, networkStatus, fetchMore, refetch } = useTypedQuery(
    QueryContentDocument,
    {
      variables: {
        first: pageSize,
        query,
        orderBy,
      },
      notifyOnNetworkStatusChange: true,
      ...options,
    },
  );

  const connection = data?.queryContent;
  const contents = useMemo<Content[]>(
    () => connection?.edges?.map((edge) => edge.node) ?? [],
    [connection?.edges],
  );
  const totalCount = connection?.totalCount ?? 0;
  const hasNextPage = connection?.pageInfo?.hasNextPage ?? false;
  const endCursor = connection?.pageInfo?.endCursor ?? null;

  // Cache-level merge owned by the typePolicy on `Query.queryContent`
  // (apps/web/src/apollo/type-policies). No `updateQuery` here — and
  // crucially, mutations' `refetchQueries: ['queryContent']` (create /
  // duplicate / publish / unpublish) replace the accumulator with a
  // fresh page 1 instead of leaving it stale.
  const { loadingMore, pageFailed, fetchNextPage, retryNextPage } = useCursorFetchMore({
    loading: loading || refreshing,
    networkStatus,
    hasNextPage,
    endCursor,
    fetchMore,
    buildVariables: (after) => ({ first: pageSize, after, query, orderBy }),
  });

  return {
    contents,
    totalCount,
    hasNextPage,
    loading: loading && !loadingMore,
    loadingMore,
    pageFailed,
    fetchNextPage,
    retryNextPage,
    refetch,
  };
};

// ---- listContentVersions: cursor pagination with fetchMore ----

/** A row of the version history: the version without its steps and data. */
export type ContentVersionListItem = NonNullable<
  ListContentVersionsQuery['listContentVersions']['edges']
>[number]['node'];

const VERSION_LIST_PAGE_SIZE = 20;

export const useListContentVersionsQuery = (
  contentId: string | undefined,
  options?: TypedQueryOptions<ListContentVersionsQuery, ListContentVersionsQueryVariables>,
) => {
  const { data, loading, refreshing, networkStatus, fetchMore, refetch } = useTypedQuery(
    ListContentVersionsDocument,
    {
      variables: { contentId: contentId!, first: VERSION_LIST_PAGE_SIZE },
      notifyOnNetworkStatusChange: true,
      skip: !contentId,
      ...options,
    },
  );

  const connection = data?.listContentVersions;
  const versionList = useMemo<ContentVersionListItem[]>(
    () => connection?.edges?.map((edge) => edge.node) ?? [],
    [connection?.edges],
  );
  const hasNextPage = connection?.pageInfo?.hasNextPage ?? false;
  const endCursor = connection?.pageInfo?.endCursor ?? null;
  const totalCount = connection?.totalCount ?? 0;

  // The cache-level merge is owned by the typePolicy on
  // `Query.listContentVersions` (apps/web/src/apollo/type-policies).
  // No `updateQuery` here. The accumulator relies on the
  // "single-accumulator-consumer" invariant documented at the
  // typePolicy site: a base refetch (no `after`) replaces, so adding a
  // second cache-and-network consumer of the same cell would collapse
  // the accumulator to page 1.
  const { loadingMore, pageFailed, fetchNextPage, retryNextPage } = useCursorFetchMore({
    loading: loading || refreshing,
    networkStatus,
    hasNextPage,
    endCursor,
    fetchMore,
    buildVariables: (after) => ({ contentId, first: VERSION_LIST_PAGE_SIZE, after }),
  });

  return {
    versionList,
    totalCount,
    hasNextPage,
    loading: loading && !loadingMore,
    loadingMore,
    pageFailed,
    fetchNextPage,
    retryNextPage,
    refetch,
  };
};

const PUBLISH_HISTORY_PAGE_SIZE = 20;

/** Per-content publish history (cursor pagination; cache merge owned by the
 * `Query.listContentPublishRecords` typePolicy, same accumulator pattern as
 * the versions list). */
export const useListContentPublishRecordsQuery = (
  contentId: string | undefined,
  environmentId?: string,
  options?: TypedQueryOptions<
    ListContentPublishRecordsQuery,
    ListContentPublishRecordsQueryVariables
  >,
) => {
  const { data, loading, refreshing, networkStatus, fetchMore, refetch } = useTypedQuery(
    ListContentPublishRecordsDocument,
    {
      variables: { contentId: contentId!, environmentId, first: PUBLISH_HISTORY_PAGE_SIZE },
      notifyOnNetworkStatusChange: true,
      skip: !contentId,
      ...options,
    },
  );

  const connection = data?.listContentPublishRecords;
  const recordList = useMemo(
    () => connection?.edges?.map((edge) => edge.node) ?? [],
    [connection?.edges],
  );
  const hasNextPage = connection?.pageInfo?.hasNextPage ?? false;
  const endCursor = connection?.pageInfo?.endCursor ?? null;
  const totalCount = connection?.totalCount ?? 0;

  const { loadingMore, pageFailed, fetchNextPage, retryNextPage } = useCursorFetchMore({
    loading: loading || refreshing,
    networkStatus,
    hasNextPage,
    endCursor,
    fetchMore,
    buildVariables: (after) => ({
      contentId,
      environmentId,
      first: PUBLISH_HISTORY_PAGE_SIZE,
      after,
    }),
  });

  return {
    recordList,
    totalCount,
    hasNextPage,
    loading: loading && !loadingMore,
    loadingMore,
    pageFailed,
    fetchNextPage,
    retryNextPage,
    refetch,
  };
};

// ---- mutations ----

export type CreateContentInput = CreateContentMutationVariables;

export const useCreateContentMutation = () => {
  // Refresh the list so the new row appears — Apollo can't materialise
  // a new edge from a mutation response.
  const [mutation, { loading, error }] = useMutation(CreateContentDocument, {
    refetchQueries: ['queryContent'],
  });
  const invoke = async (input: CreateContentInput): Promise<Content | undefined> => {
    const response = await mutation({ variables: input });
    return response.data?.createContent;
  };
  return { invoke, loading, error };
};

export type DuplicateContentInput = DuplicateContentMutationVariables;

export const useDuplicateContentMutation = () => {
  const [mutation, { loading, error }] = useMutation(DuplicateContentDocument, {
    refetchQueries: ['queryContent'],
  });
  const invoke = async (
    input: DuplicateContentInput,
  ): Promise<{ id: string; name: string | null } | undefined> => {
    const response = await mutation({ variables: input });
    return response.data?.duplicateContent;
  };
  return { invoke, loading, error };
};

export const usePublishContentVersionMutation = () => {
  // Publish flips `Content.contentOnEnvironments[].published` —
  // refetch the owning content so list cell + detail header reflect
  // the new state.
  const [mutation, { loading, error }] = useMutation(PublishedContentVersionDocument, {
    refetchQueries: ['getContent', 'queryContent', 'listContentPublishRecords'],
  });
  const invoke = async (versionId: string, environmentId: string): Promise<boolean> => {
    const response = await mutation({ variables: { versionId, environmentId } });
    return !!response.data?.publishedContentVersion?.id;
  };
  return { invoke, loading, error };
};

export const useUnpublishContentVersionMutation = () => {
  const [mutation, { loading, error }] = useMutation(UnpublishedContentVersionDocument, {
    refetchQueries: ['getContent', 'queryContent', 'listContentPublishRecords'],
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
  const [mutation, { loading, error }] = useMutation(RestoreContentVersionDocument, {
    refetchQueries: ['getContent', 'listContentVersions'],
  });
  const invoke = async (versionId: string): Promise<boolean> => {
    const response = await mutation({ variables: { versionId } });
    return !!response.data?.restoreContentVersion?.id;
  };
  return { invoke, loading, error };
};
