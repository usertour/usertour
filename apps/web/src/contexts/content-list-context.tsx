import { PaginationState } from '@tanstack/react-table';
import { useContentListQuery } from '@usertour-packages/shared-hooks';
import { Pagination } from '@usertour/types';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

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

// const defaultPagination = {
//   pageIndex: 0,
//   pageSize: 10,
// }

const getQueryType = (contentType: string) => {
  if (contentType === 'launchers') {
    return 'launcher';
  }
  if (contentType === 'banners') {
    return 'banner';
  }
  if (contentType === 'checklists') {
    return 'checklist';
  }
  if (contentType === 'surveys') {
    return 'survey';
  }
  if (contentType === 'nps') {
    return 'nps';
  }

  return 'flow';
};

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
  const [searchParams, _] = useSearchParams();
  const published = searchParams.get('published') === '1';
  const [query, setQuery] = useState<any>({ published, ...defaultQuery });
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
