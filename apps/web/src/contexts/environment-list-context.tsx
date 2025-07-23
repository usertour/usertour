import { ReactNode, createContext, useContext } from 'react';
import { useGetUserEnvironmentsQuery } from '@usertour-packages/shared-hooks';
import { Environment } from '@usertour-packages/types';

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
  const { environmentList, refetch, loading, isRefetching } =
    useGetUserEnvironmentsQuery(projectId);

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
