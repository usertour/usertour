import { useQuery } from '@apollo/client';
import { listContentVersions } from '@usertour-packages/gql';
import { ContentVersion } from '@usertour/types';
import { ReactNode, createContext, useCallback, useContext, useMemo, useRef } from 'react';

const PAGE_SIZE = 20;

export interface ContentVersionListProviderProps {
  children: ReactNode;
  contentId: string;
}

export interface ContentVersionListContextValue {
  versionList: ContentVersion[];
  totalCount: number;
  hasNextPage: boolean;
  loading: boolean;
  loadingMore: boolean;
  fetchNextPage: () => void;
  refetch: () => Promise<unknown>;
}

export const ContentVersionListContext = createContext<ContentVersionListContextValue | undefined>(
  undefined,
);

type Edge = { cursor: string; node: ContentVersion };
type PageInfo = { endCursor: string | null; hasNextPage: boolean };
type QueryData = {
  listContentVersions: {
    totalCount: number;
    edges: Edge[];
    pageInfo: PageInfo;
  };
};

export function ContentVersionListProvider(props: ContentVersionListProviderProps): JSX.Element {
  const { children, contentId } = props;

  const { data, loading, networkStatus, fetchMore, refetch } = useQuery<QueryData>(
    listContentVersions,
    {
      variables: { contentId, first: PAGE_SIZE },
      notifyOnNetworkStatusChange: true,
      skip: !contentId,
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

  const loadingMore = networkStatus === 3;
  const fetchingRef = useRef(false);

  const fetchNextPage = useCallback(async () => {
    if (!hasNextPage || loading || fetchingRef.current || !endCursor) return;
    fetchingRef.current = true;
    try {
      await fetchMore({
        variables: { contentId, first: PAGE_SIZE, after: endCursor },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
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

  const value: ContentVersionListContextValue = {
    versionList,
    totalCount,
    hasNextPage,
    loading: loading && !loadingMore,
    loadingMore,
    fetchNextPage,
    refetch,
  };

  return (
    <ContentVersionListContext.Provider value={value}>
      {children}
    </ContentVersionListContext.Provider>
  );
}

export function useContentVersionListContext(): ContentVersionListContextValue {
  const context = useContext(ContentVersionListContext);
  if (!context) {
    throw new Error(
      'useContentVersionListContext must be used within a ContentVersionListProvider.',
    );
  }
  return context;
}
