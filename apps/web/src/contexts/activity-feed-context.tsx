import { useQuery } from '@apollo/client';
import { queryBizUserEvents, queryBizCompanyEvents } from '@usertour-packages/gql';
import { BizEvent } from '@usertour/types';
import { PageInfo } from '@usertour/types';
import { ReactNode, createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DocumentNode } from '@apollo/client';

interface ActivityFeedContextValue {
  events: BizEvent[];
  loading: boolean;
  totalCount: number;
  loadMore: () => void;
  refetch: () => void;
  hasNextPage: boolean;
}

const ActivityFeedContext = createContext<ActivityFeedContextValue | undefined>(undefined);

export const useActivityFeedContext = () => {
  const context = useContext(ActivityFeedContext);
  if (!context) {
    throw new Error('useActivityFeedContext must be used within an ActivityFeedProvider');
  }
  return context;
};

interface ActivityFeedProviderProps {
  children: ReactNode;
  gqlQuery: DocumentNode;
  queryKey: string;
  variables: {
    environmentId: string;
    userId?: string;
    companyId?: string;
  };
}

interface ActivityFeedEdge {
  node: BizEvent;
}

export const ActivityFeedProvider = ({
  children,
  gqlQuery,
  queryKey,
  variables,
}: ActivityFeedProviderProps) => {
  const [events, setEvents] = useState<BizEvent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [afterCursor, setAfterCursor] = useState<string | undefined>(undefined);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const pageSize = 20;

  const { data, refetch, loading } = useQuery(gqlQuery, {
    variables: {
      first: pageSize,
      after: afterCursor,
      query: variables,
      orderBy: { field: 'createdAt', direction: 'desc' },
    },
  });

  const resultData = data?.[queryKey];

  useEffect(() => {
    if (!resultData) return;
    const { edges, pageInfo: newPageInfo, totalCount: newTotalCount } = resultData;
    if (!edges || !newPageInfo) return;

    setPageInfo(newPageInfo);
    const newEvents: BizEvent[] = edges.map((edge: ActivityFeedEdge) => edge.node);

    setEvents((prev) => {
      if (!afterCursor) {
        return newEvents;
      }

      const existingIds = new Set(prev.map((ev) => ev.id));
      const unique = newEvents.filter((ev) => !existingIds.has(ev.id));
      return [...prev, ...unique];
    });
    setTotalCount(newTotalCount);
    setIsLoadingMore(false);
  }, [afterCursor, resultData]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && pageInfo?.hasNextPage) {
      setIsLoadingMore(true);
      setAfterCursor(pageInfo.endCursor);
    }
  }, [isLoadingMore, pageInfo]);

  const handleRefetch = useCallback(() => {
    setEvents([]);
    setTotalCount(0);
    setIsLoadingMore(false);
    setPageInfo(null);
    setAfterCursor(undefined);
    refetch({
      first: pageSize,
      after: undefined,
      query: variables,
      orderBy: { field: 'createdAt', direction: 'desc' },
    });
  }, [refetch, variables]);

  useEffect(() => {
    setEvents([]);
    setTotalCount(0);
    setIsLoadingMore(false);
    setPageInfo(null);
    setAfterCursor(undefined);
  }, [gqlQuery, queryKey, variables.companyId, variables.environmentId, variables.userId]);

  const value: ActivityFeedContextValue = {
    events,
    loading: loading || isLoadingMore,
    totalCount,
    loadMore,
    refetch: handleRefetch,
    hasNextPage: pageInfo?.hasNextPage || false,
  };

  return <ActivityFeedContext.Provider value={value}>{children}</ActivityFeedContext.Provider>;
};

// Convenience wrappers
interface UserActivityFeedProviderProps {
  children: ReactNode;
  environmentId: string;
  userId: string;
}

export const UserActivityFeedProvider = ({
  children,
  environmentId,
  userId,
}: UserActivityFeedProviderProps) => (
  <ActivityFeedProvider
    gqlQuery={queryBizUserEvents}
    queryKey="queryBizUserEvents"
    variables={{ environmentId, userId }}
  >
    {children}
  </ActivityFeedProvider>
);

interface CompanyActivityFeedProviderProps {
  children: ReactNode;
  environmentId: string;
  companyId: string;
}

export const CompanyActivityFeedProvider = ({
  children,
  environmentId,
  companyId,
}: CompanyActivityFeedProviderProps) => (
  <ActivityFeedProvider
    gqlQuery={queryBizCompanyEvents}
    queryKey="queryBizCompanyEvents"
    variables={{ environmentId, companyId }}
  >
    {children}
  </ActivityFeedProvider>
);
