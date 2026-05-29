import { ReactNode, createContext, useContext } from 'react';
import { useGetUserEnvironmentsQuery } from '@usertour/hooks';
import { Environment } from '@usertour/types';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';

export interface EnvironmentListProviderProps {
  children?: ReactNode;
  projectId: string | undefined;
}

export interface EnvironmentListContextValue {
  environmentList: Environment[] | null;
  refetch: any;
  loading: boolean;
  isRefetching: boolean;
}
export const EnvironmentListContext = createContext<EnvironmentListContextValue | undefined>(
  undefined,
);

export function EnvironmentListProvider(props: EnvironmentListProviderProps): JSX.Element {
  const { children, projectId } = props;
  // SHARED_CACHE_QUERY_OPTIONS so this query participates in the
  // normalized cache — without it the global no-cache default keeps
  // this observable isolated, and the env switcher (which reads from
  // here) wouldn't reflect cache evicts from useDeleteEnvironmentsMutation.
  const { environmentList, refetch, loading, isRefetching } = useGetUserEnvironmentsQuery(
    projectId,
    SHARED_CACHE_QUERY_OPTIONS,
  );

  const value: EnvironmentListContextValue = {
    environmentList,
    refetch,
    loading,
    isRefetching,
  };

  return (
    <EnvironmentListContext.Provider value={value}>{children}</EnvironmentListContext.Provider>
  );
}

export function useEnvironmentListContext(): EnvironmentListContextValue {
  const context = useContext(EnvironmentListContext);
  if (!context) {
    throw new Error('useEnvironmentListContext must be used within a EnvironmentListProvider.');
  }
  return context;
}
