import { NetworkStatus, useQuery } from '@apollo/client';
import { PaginationState } from '@tanstack/react-table';
import { queryBizUser } from '@usertour-packages/gql';
import { BizUser, PageInfo, Pagination } from '@usertour-packages/types';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

interface UserQuery {
  environmentId?: string;
  [key: string]: any;
}

export interface UserListProviderProps {
  children?: ReactNode;
  environmentId: string | undefined;
  defaultQuery?: UserQuery;
}

export interface UserListContextValue {
  refetch: any;
  requestPagination: Pagination;
  setRequestPagination: React.Dispatch<React.SetStateAction<Pagination>>;
  query: UserQuery;
  setQuery: React.Dispatch<React.SetStateAction<UserQuery>>;
  pagination: PaginationState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  pageCount: number;
  contents: BizUser[];
  loading: boolean;
  isRefetching: boolean;
}
export const UserListContext = createContext<UserListContextValue | undefined>(undefined);

const defaultPagination = {
  pageIndex: 0,
  pageSize: 10,
};

export function UserListProvider(props: UserListProviderProps): JSX.Element {
  const { children, environmentId, defaultQuery = {} } = props;
  const [requestPagination, setRequestPagination] = useState<Pagination>({
    first: defaultPagination.pageSize,
  });
  const [query, setQuery] = useState<UserQuery>(defaultQuery);
  const [pagination, setPagination] = useState<PaginationState>({
    ...defaultPagination,
  });
  const [currentPagination, setCurrentPagination] = useState<PaginationState>({
    ...defaultPagination,
  });
  const [currentPageInfo, setCurrentPageInfo] = useState<PageInfo>();
  const [contents, setContents] = useState<BizUser[]>([]);
  const [pageCount, setPageCount] = useState(defaultPagination.pageSize);
  const [totalCount, setTotalCount] = useState<number>(0);

  const { data, refetch, loading, networkStatus } = useQuery(queryBizUser, {
    variables: {
      ...requestPagination,
      query: { environmentId, ...query },
      orderBy: { field: 'createdAt', direction: 'desc' },
    },
    notifyOnNetworkStatusChange: true,
  });

  const isRefetching = networkStatus === NetworkStatus.refetch;

  const bizUserList = data?.queryBizUser;

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
  }, [pagination, currentPagination, currentPageInfo]);

  useEffect(() => {
    if (!bizUserList) {
      return;
    }
    const { edges, pageInfo, totalCount } = bizUserList;
    if (!edges || !pageInfo) {
      return;
    }

    setCurrentPageInfo(pageInfo);
    const c = edges.map((e: any) => {
      return { ...e.node, ...e.node.data };
    });
    setContents(c);
    setTotalCount(totalCount);
    setPageCount(Math.ceil(totalCount / currentPagination.pageSize));
  }, [bizUserList, currentPagination]);

  useEffect(() => {
    refetch();
  }, [query, requestPagination]);

  const value: UserListContextValue = {
    refetch,
    requestPagination,
    setRequestPagination,
    query,
    setQuery,
    pagination,
    setPagination,
    pageCount,
    contents,
    loading,
    isRefetching,
  };

  return <UserListContext.Provider value={value}>{children}</UserListContext.Provider>;
}

export function useUserListContext(): UserListContextValue {
  const context = useContext(UserListContext);
  if (!context) {
    throw new Error('useUserListContext must be used within a UserListProvider.');
  }
  return context;
}
