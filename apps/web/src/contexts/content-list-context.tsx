import { useQuery } from '@apollo/client';
import { PaginationState } from '@tanstack/react-table';
import { queryContent } from '@usertour-ui/gql';
import { Content, PageInfo, Pagination } from '@usertour-ui/types';
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
  contentList: any;
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
  const [currentPageInfo, setCurrentPageInfo] = useState<PageInfo>();
  const [contents, setContents] = useState<Content[]>([]);
  const [pageCount, setPageCount] = useState(defaultPagination.pageSize);
  const [totalCount, setTotalCount] = useState<number>(0);

  const { data, refetch, loading } = useQuery(queryContent, {
    variables: {
      ...requestPagination,
      query: { environmentId, type: getQueryType(contentType), ...query },
      orderBy: { field: 'createdAt', direction: 'desc' },
    },
    skip: !environmentId,
  });

  const contentList = data?.queryContent;

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
    if (!contentList) {
      return;
    }
    const { edges, pageInfo, totalCount } = contentList;
    if (!edges || !pageInfo) {
      return;
    }

    setCurrentPageInfo(pageInfo);
    const c: Content[] = edges.map((e: any) => {
      return { ...e.node };
    });
    setContents(c);
    setTotalCount(totalCount);
    setPageCount(Math.ceil(totalCount / currentPagination.pageSize));
  }, [contentList, currentPagination]);

  useEffect(() => {
    refetch();
  }, [query, requestPagination]);

  const value: ContentListContextValue = {
    contentList,
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
