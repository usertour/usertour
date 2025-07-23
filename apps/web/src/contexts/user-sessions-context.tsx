import { useQuery } from '@apollo/client';
import { PaginationState } from '@tanstack/react-table';
import { querySessionsByExternalId } from '@usertour-packages/gql';
import { BizSession, PageInfo, Pagination, SessionQuery } from '@usertour/types';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

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
  refetch: any;
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
  const [requestPagination, setRequestPagination] = useState<Pagination>({
    first: defaultPagination.pageSize,
  });
  const [pagination, setPagination] = useState<PaginationState>({
    ...defaultPagination,
  });
  const [currentPagination, setCurrentPagination] = useState<PaginationState>({
    ...defaultPagination,
  });
  const [currentPageInfo, setCurrentPageInfo] = useState<PageInfo>();
  const [userSessions, setUserSessions] = useState<BizSession[]>([]);
  const [pageCount, setPageCount] = useState(defaultPagination.pageSize);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const query: SessionQuery = {
    environmentId,
    externalUserId,
  };

  const { data, refetch, loading } = useQuery(querySessionsByExternalId, {
    variables: {
      ...requestPagination,
      query,
      orderBy: { field: 'createdAt', direction: 'desc' },
    },
  });

  const sessionsList = data?.querySessionsByExternalId;

  useEffect(() => {
    const { pageIndex, pageSize } = pagination;
    let varis: Pagination = { first: pageSize };
    if (
      currentPagination &&
      pageSize === currentPagination.pageSize &&
      pageIndex === currentPagination.pageIndex
    ) {
      return;
    }

    if (pageIndex === 0) {
      varis = { first: pageSize };
    } else if (pageIndex + 1 === pageCount) {
      const costSize = totalCount - (pageCount - 1) * pageSize;
      varis = {
        last: costSize > 0 ? costSize : pageSize,
      };
    } else if (currentPageInfo && pageIndex > currentPagination.pageIndex) {
      varis = {
        first: pageSize,
        after: currentPageInfo.endCursor,
      };
    } else if (currentPageInfo && pageIndex < currentPagination.pageIndex) {
      varis = {
        last: pageSize,
        before: currentPageInfo.startCursor,
      };
    }
    setCurrentPagination({ ...pagination });
    setRequestPagination(varis);
  }, [pagination, currentPagination, currentPageInfo, totalCount]);

  useEffect(() => {
    if (!sessionsList) {
      return;
    }
    const { edges, pageInfo, totalCount } = sessionsList;
    if (!edges || !pageInfo) {
      return;
    }
    setCurrentPageInfo(pageInfo);
    const newSessions: BizSession[] = edges.map((e: any) => {
      return { ...e.node };
    });

    // Always accumulate data - never replace
    setUserSessions((prev) => {
      // Create a Set of existing session IDs to avoid duplicates
      const existingIds = new Set(prev.map((session) => session.id));
      const uniqueNewSessions = newSessions.filter((session) => !existingIds.has(session.id));
      return [...prev, ...uniqueNewSessions];
    });

    setTotalCount(totalCount);
    setPageCount(Math.ceil(totalCount / currentPagination.pageSize));
    setIsLoadingMore(false);
  }, [sessionsList, currentPagination, pagination.pageIndex, isLoadingMore]);

  useEffect(() => {
    refetch();
  }, [requestPagination]);

  const loadMore = () => {
    if (userSessions.length < totalCount && !isLoadingMore) {
      setIsLoadingMore(true);
      setPagination((prev) => ({
        ...prev,
        pageIndex: prev.pageIndex + 1,
      }));
    }
  };

  const value: UserSessionsContextValue = {
    userSessions,
    refetch,
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
