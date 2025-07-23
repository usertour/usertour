import { useQuery } from '@apollo/client';
import { PaginationState } from '@tanstack/react-table';
import { queryBizCompany } from '@usertour-packages/gql';
import { BizCompany, PageInfo, Pagination } from '@usertour/types';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

interface CompanyQuery {
  environmentId?: string;
  [key: string]: any;
}

export interface CompanyListProviderProps {
  children?: ReactNode;
  environmentId: string | undefined;
  defaultQuery?: CompanyQuery;
}

export interface CompanyListContextValue {
  refetch: any;
  requestPagination: Pagination;
  setRequestPagination: React.Dispatch<React.SetStateAction<Pagination>>;
  query: CompanyQuery;
  setQuery: React.Dispatch<React.SetStateAction<CompanyQuery>>;
  pagination: PaginationState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  pageCount: number;
  contents: BizCompany[];
  loading: boolean;
}
export const CompanyListContext = createContext<CompanyListContextValue | undefined>(undefined);

const defaultPagination = {
  pageIndex: 0,
  pageSize: 10,
};

export function CompanyListProvider(props: CompanyListProviderProps): JSX.Element {
  const { children, environmentId, defaultQuery = {} } = props;
  const [requestPagination, setRequestPagination] = useState<Pagination>({
    first: defaultPagination.pageSize,
  });
  const [query, setQuery] = useState<CompanyQuery>(defaultQuery);
  const [pagination, setPagination] = useState<PaginationState>({
    ...defaultPagination,
  });
  const [currentPagination, setCurrentPagination] = useState<PaginationState>({
    ...defaultPagination,
  });
  const [currentPageInfo, setCurrentPageInfo] = useState<PageInfo>();
  const [contents, setContents] = useState<BizCompany[]>([]);
  const [pageCount, setPageCount] = useState(defaultPagination.pageSize);
  const [totalCount, setTotalCount] = useState<number>(0);

  const { data, refetch, loading } = useQuery(queryBizCompany, {
    variables: {
      ...requestPagination,
      query: { environmentId, ...query },
      orderBy: { field: 'createdAt', direction: 'desc' },
    },
  });

  const bizCompanyList = data?.queryBizCompany;

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
    if (!bizCompanyList) {
      return;
    }
    const { edges, pageInfo, totalCount } = bizCompanyList;
    if (!edges || !pageInfo) {
      return;
    }

    setCurrentPageInfo(pageInfo);
    const c = edges.map((e: any) => {
      return { ...e.node };
    });
    setContents(c);
    setTotalCount(totalCount);
    setPageCount(Math.ceil(totalCount / currentPagination.pageSize));
  }, [bizCompanyList, currentPagination]);

  useEffect(() => {
    refetch();
  }, [query, requestPagination]);

  const value: CompanyListContextValue = {
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
  };

  return <CompanyListContext.Provider value={value}>{children}</CompanyListContext.Provider>;
}

export function useCompanyListContext(): CompanyListContextValue {
  const context = useContext(CompanyListContext);
  if (!context) {
    throw new Error('useCompanyListContext must be used within a CompanyListProvider.');
  }
  return context;
}
