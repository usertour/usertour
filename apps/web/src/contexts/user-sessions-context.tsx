import { useQuery } from '@apollo/client';
import { PaginationState } from '@tanstack/react-table';
import { querySessionsByExternalId } from '@usertour-packages/gql';
import { BizSession, PageInfo, Pagination } from '@usertour/types';
import { ReactNode, createContext, useContext, useEffect, useState, useCallback } from 'react';

const defaultPagination = {
  pageIndex: 0,
  pageSize: 10,
};

export interface UserSessionsProviderProps {
  children?: ReactNode;
  environmentId: string;
  externalUserId: string;
  defaultPagination?: typeof defaultPagination;
}

export interface UserSessionsContextValue {
  refetch: () => void;
  loading: boolean;
  requestPagination: Pagination;
  setRequestPagination: React.Dispatch<React.SetStateAction<Pagination>>;
  pagination: PaginationState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  pageCount: number;
  userSessions: BizSession[];
  totalCount: number;
  loadMore: () => void;
}

interface SessionEdge {
  node: BizSession;
}

const UserSessionsContext = createContext<UserSessionsContextValue | undefined>(undefined);

export const useUserSessionsContext = () => {
  const context = useContext(UserSessionsContext);
  if (!context) {
    throw new Error('useUserSessionsContext must be used within a UserSessionsProvider');
  }
  return context;
};

export function UserSessionsProvider(props: UserSessionsProviderProps): JSX.Element {
  const { children, environmentId, externalUserId } = props;
  const pageSize = defaultPagination.pageSize;
  const [requestPagination, setRequestPagination] = useState<Pagination>({
    first: pageSize,
  });
  const [pagination, setPagination] = useState<PaginationState>({
    ...defaultPagination,
  });
  const [afterCursor, setAfterCursor] = useState<string | undefined>(undefined);
  const [currentPageInfo, setCurrentPageInfo] = useState<PageInfo | null>(null);
  const [userSessions, setUserSessions] = useState<BizSession[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { data, refetch, loading } = useQuery(querySessionsByExternalId, {
    variables: {
      ...requestPagination,
      query: {
        environmentId,
        externalUserId,
      },
      orderBy: { field: 'createdAt', direction: 'desc' },
    },
  });

  const sessionsList = data?.querySessionsByExternalId;

  useEffect(() => {
    setRequestPagination({
      first: pagination.pageSize,
      after: afterCursor,
    });
  }, [afterCursor, pagination.pageSize]);

  useEffect(() => {
    if (!sessionsList) {
      return;
    }
    const { edges, pageInfo, totalCount } = sessionsList;
    if (!edges || !pageInfo) {
      return;
    }
    setCurrentPageInfo(pageInfo);
    const newSessions: BizSession[] = edges.map((edge: SessionEdge) => ({ ...edge.node }));

    setUserSessions((prev) => {
      if (!afterCursor) {
        return newSessions;
      }

      const existingIds = new Set(prev.map((session) => session.id));
      const uniqueNewSessions = newSessions.filter((session) => !existingIds.has(session.id));
      return [...prev, ...uniqueNewSessions];
    });

    setTotalCount(totalCount);
    setPageCount(Math.ceil(totalCount / pagination.pageSize));
    setIsLoadingMore(false);
  }, [afterCursor, pagination.pageSize, sessionsList]);

  const reset = useCallback(() => {
    setRequestPagination({ first: pageSize });
    setPagination({ ...defaultPagination });
    setAfterCursor(undefined);
    setCurrentPageInfo(null);
    setUserSessions([]);
    setPageCount(0);
    setTotalCount(0);
    setIsLoadingMore(false);
  }, [pageSize]);

  useEffect(() => {
    reset();
  }, [environmentId, externalUserId, reset]);

  const handleRefetch = useCallback(() => {
    reset();
    refetch({
      first: pageSize,
      query: {
        environmentId,
        externalUserId,
      },
      orderBy: { field: 'createdAt', direction: 'desc' },
    });
  }, [environmentId, externalUserId, pageSize, refetch, reset]);

  const loadMore = () => {
    if (!isLoadingMore && currentPageInfo?.hasNextPage) {
      setIsLoadingMore(true);
      setPagination((prev) => ({
        ...prev,
        pageIndex: prev.pageIndex + 1,
      }));
      setAfterCursor(currentPageInfo.endCursor);
    }
  };

  const value: UserSessionsContextValue = {
    userSessions,
    refetch: handleRefetch,
    loading: loading || isLoadingMore,
    requestPagination,
    setRequestPagination,
    pagination,
    setPagination,
    pageCount,
    totalCount,
    loadMore,
  };

  return <UserSessionsContext.Provider value={value}>{children}</UserSessionsContext.Provider>;
}
