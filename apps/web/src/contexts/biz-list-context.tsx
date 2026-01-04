import { NetworkStatus, useQuery, DocumentNode } from '@apollo/client';
import { PaginationState } from '@tanstack/react-table';
import { PageInfo, Pagination } from '@usertour/types';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

interface BizQuery {
  environmentId?: string;
  [key: string]: any;
}

export interface BizListProviderProps<T> {
  children?: ReactNode;
  environmentId: string | undefined;
  defaultQuery?: BizQuery;
  query: DocumentNode;
  dataProcessor: (edges: any[]) => T[];
}

export interface BizListContextValue<T> {
  refetch: any;
  requestPagination: Pagination;
  setRequestPagination: React.Dispatch<React.SetStateAction<Pagination>>;
  query: BizQuery;
  setQuery: React.Dispatch<React.SetStateAction<BizQuery>>;
  pagination: PaginationState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  pageCount: number;
  contents: T[];
  loading: boolean;
  isRefetching: boolean;
}

export function createBizListContext<T>() {
  const BizListContext = createContext<BizListContextValue<T> | undefined>(undefined);

  const defaultPagination = {
    pageIndex: 0,
    pageSize: 10,
  };

  function BizListProvider({
    children,
    environmentId,
    defaultQuery = {},
    query,
    dataProcessor,
  }: BizListProviderProps<T>): JSX.Element {
    const [requestPagination, setRequestPagination] = useState<Pagination>({
      first: defaultPagination.pageSize,
    });
    const [queryState, setQueryState] = useState<BizQuery>(defaultQuery);
    const [pagination, setPagination] = useState<PaginationState>({
      ...defaultPagination,
    });
    const [currentPagination, setCurrentPagination] = useState<PaginationState>({
      ...defaultPagination,
    });
    const [currentPageInfo, setCurrentPageInfo] = useState<PageInfo>();
    const [contents, setContents] = useState<T[]>([]);
    const [pageCount, setPageCount] = useState(defaultPagination.pageSize);
    const [totalCount, setTotalCount] = useState<number>(0);

    const { data, refetch, loading, networkStatus } = useQuery(query, {
      variables: {
        ...requestPagination,
        query: { environmentId, ...queryState },
        orderBy: { field: 'createdAt', direction: 'desc' },
      },
      notifyOnNetworkStatusChange: true,
    });

    const isRefetching = networkStatus === NetworkStatus.refetch;

    // Extract the data from the query result
    // The query result structure is typically { queryBizUser: {...} } or { queryBizCompany: {...} }
    const queryKey = Object.keys(data || {})[0];
    const bizList = data?.[queryKey];

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
      if (!bizList) {
        return;
      }
      const { edges, pageInfo, totalCount: tc } = bizList;
      if (!edges || !pageInfo) {
        return;
      }

      setCurrentPageInfo(pageInfo);
      const processedContents = dataProcessor(edges);
      setContents(processedContents);
      setTotalCount(tc);
      setPageCount(Math.ceil(tc / currentPagination.pageSize));
    }, [bizList, currentPagination, dataProcessor]);

    useEffect(() => {
      refetch();
    }, [queryState, requestPagination]);

    const value: BizListContextValue<T> = {
      refetch,
      requestPagination,
      setRequestPagination,
      query: queryState,
      setQuery: setQueryState,
      pagination,
      setPagination,
      pageCount,
      contents,
      loading,
      isRefetching,
    };

    return <BizListContext.Provider value={value}>{children}</BizListContext.Provider>;
  }

  function useBizListContext(): BizListContextValue<T> {
    const context = useContext(BizListContext);
    if (!context) {
      throw new Error('useBizListContext must be used within a BizListProvider.');
    }
    return context;
  }

  return {
    BizListProvider,
    useBizListContext,
  };
}

// Create specific contexts for User and Company
export const { BizListProvider: UserListProvider, useBizListContext: useUserListContext } =
  createBizListContext();

export const { BizListProvider: CompanyListProvider, useBizListContext: useCompanyListContext } =
  createBizListContext();
