import { PaginationState } from '@tanstack/react-table';
import { useContentListQuery } from '@usertour-packages/shared-hooks';
import { Pagination } from '@usertour/types';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getQueryType } from '@/utils/content';

interface ContentQuery {
  environmentId?: string;
  type?: string;
  published?: boolean;
  [key: string]: any;
}

const defaultPagination = {
  pageIndex: 0,
  pageSize: 10,
};

export interface ContentListProviderProps {
  children?: ReactNode;
  environmentId: string | undefined;
  defaultQuery?: ContentQuery;
  defaultPagination?: typeof defaultPagination;
  contentType: string;
}

export interface ContentListContextValue {
  refetch: any;
  requestPagination: Pagination;
  setRequestPagination: React.Dispatch<React.SetStateAction<Pagination>>;
  query: any;
  setQuery: React.Dispatch<React.SetStateAction<any>>;
  pagination: PaginationState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  pageCount: number;
  contents: any[];
  totalCount: number;
  contentType: string;
  isLoading: boolean;
}

export const ContentListContext = createContext<ContentListContextValue | undefined>(undefined);

export function ContentListProvider(props: ContentListProviderProps): JSX.Element {
  const {
    children,
    environmentId,
    defaultQuery = {},
    defaultPagination = { pageIndex: 0, pageSize: 10 },
    contentType,
  } = props;
  const [requestPagination, setRequestPagination] = useState<Pagination>({
    first: defaultPagination.pageSize,
  });
  const [searchParams] = useSearchParams();
  // Parse published status from URL, default to false (Draft) if not present
  const publishedParam = searchParams.get('published');
  const publishedFromUrl = publishedParam === '1';
  const [query, setQuery] = useState<any>({ published: publishedFromUrl, ...defaultQuery });
  const [pagination, setPagination] = useState<PaginationState>({
    ...defaultPagination,
  });
  const [currentPagination, setCurrentPagination] = useState<PaginationState>({
    ...defaultPagination,
  });

  const {
    contents,
    pageInfo: currentPageInfo,
    totalCount,
    refetch,
    loading,
  } = useContentListQuery({
    query: { environmentId, type: getQueryType(contentType), ...query },
    pagination: { ...requestPagination },
    options: { skip: !environmentId },
  });

  const pageCount = Math.ceil(totalCount / currentPagination.pageSize);

  // Sync query state from URL parameters (handles browser back/forward)
  useEffect(() => {
    const publishedParam = searchParams.get('published');
    // Default to false (Draft) if not present
    const published = publishedParam === '1';
    setQuery((prev: any) => {
      // Only update if the published status actually changed
      if (prev.published !== published) {
        return { ...prev, published };
      }
      return prev;
    });
  }, [searchParams]);

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
    refetch();
  }, [query, requestPagination]);

  const value: ContentListContextValue = {
    refetch,
    requestPagination,
    setRequestPagination,
    query,
    setQuery,
    pagination,
    setPagination,
    pageCount,
    contents,
    totalCount,
    contentType,
    isLoading: loading,
  };

  return <ContentListContext.Provider value={value}>{children}</ContentListContext.Provider>;
}

export function useContentListContext(): ContentListContextValue {
  const context = useContext(ContentListContext);
  if (!context) {
    throw new Error('useContentListContext must be used within a ContentListProvider.');
  }
  return context;
}
