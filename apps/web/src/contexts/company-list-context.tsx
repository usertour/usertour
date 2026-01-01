import { queryBizCompany } from '@usertour-packages/gql';
import { BizCompany, Pagination } from '@usertour/types';
import { PaginationState } from '@tanstack/react-table';
import { createBizListContext } from './biz-list-context';

interface CompanyQuery {
  environmentId?: string;
  [key: string]: any;
}

export interface CompanyListProviderProps {
  children?: React.ReactNode;
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
  isRefetching: boolean;
}

// Create the company-specific data processor
const companyDataProcessor = (edges: any[]): BizCompany[] => {
  return edges.map((e: any) => ({
    ...e.node,
  }));
};

// Create company-specific context using the generic factory
const { BizListProvider: BaseCompanyListProvider, useBizListContext: useBaseCompanyListContext } =
  createBizListContext<BizCompany>();

export function CompanyListProvider(props: CompanyListProviderProps): JSX.Element {
  return (
    <BaseCompanyListProvider
      {...props}
      query={queryBizCompany}
      dataProcessor={companyDataProcessor}
    />
  );
}

export function useCompanyListContext(): CompanyListContextValue {
  return useBaseCompanyListContext();
}
