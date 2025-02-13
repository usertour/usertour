import { Environment } from '@/types/project';
import { useQuery } from '@apollo/client';
import { getUserEnvironments } from '@usertour-ui/gql';
import { ReactNode, createContext, useContext } from 'react';

export interface EnvironmentListProviderProps {
  children?: ReactNode;
  projectId: string | undefined;
}

export interface EnvironmentListContextValue {
  environmentList: Environment[] | null;
  refetch: any;
  loading: boolean;
}
export const EnvironmentListContext = createContext<EnvironmentListContextValue | undefined>(
  undefined,
);

export function EnvironmentListProvider(props: EnvironmentListProviderProps): JSX.Element {
  const { children, projectId } = props;
  const { data, refetch, loading } = useQuery(getUserEnvironments, {
    variables: { projectId: projectId },
  });

  const environmentList = data?.userEnvironments;
  const value: EnvironmentListContextValue = {
    environmentList,
    refetch,
    loading,
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
