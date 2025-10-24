import { ReactNode, createContext, useContext } from 'react';
import { useAppContext } from './app-context';
import { useListAccessTokensQuery, AccessToken } from '@usertour-packages/shared-hooks';

export interface ApiProviderProps {
  children?: ReactNode;
}

export interface ApiContextValue {
  accessTokens: AccessToken[] | undefined;
  refetch: () => Promise<any>;
  loading: boolean;
  isRefetching: boolean;
}

export const ApiContext = createContext<ApiContextValue | undefined>(undefined);

export function ApiProvider(props: ApiProviderProps): JSX.Element {
  const { children } = props;
  const { environment } = useAppContext();
  const { accessTokens, refetch, loading, isRefetching } = useListAccessTokensQuery(
    environment?.id,
  );

  const value: ApiContextValue = {
    accessTokens,
    refetch,
    loading,
    isRefetching,
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApiContext(): ApiContextValue {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApiContext must be used within an ApiProvider');
  }
  return context;
}
