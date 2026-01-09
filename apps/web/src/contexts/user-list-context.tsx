import { queryBizUser } from '@usertour-packages/gql';
import { BizUser, Pagination } from '@usertour/types';
import { PaginationState } from '@tanstack/react-table';
import { createBizListContext } from './biz-list-context';

interface UserQuery {
  environmentId?: string;
  [key: string]: any;
}

export interface UserListProviderProps {
  children?: React.ReactNode;
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

// Create the user-specific data processor
const userDataProcessor = (edges: any[]): BizUser[] => {
  return edges.map((e: any) => ({
    ...e.node,
    ...e.node.data,
  }));
};

// Create user-specific context using the generic factory
const { BizListProvider: BaseUserListProvider, useBizListContext: useBaseUserListContext } =
  createBizListContext<BizUser>();

export function UserListProvider(props: UserListProviderProps): JSX.Element {
  return <BaseUserListProvider {...props} query={queryBizUser} dataProcessor={userDataProcessor} />;
}

export function useUserListContext(): UserListContextValue {
  return useBaseUserListContext();
}
