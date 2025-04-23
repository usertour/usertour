import { useQuery } from '@apollo/client';
import { ListAccessTokens } from '@usertour-ui/gql';
import { ReactNode, createContext, useContext } from 'react';
import { useAppContext } from './app-context';

export interface AccessToken {
  id: string;
  name: string;
  accessToken: string;
  createdAt: string;
}

export interface ApiProviderProps {
  children?: ReactNode;
}

export interface ApiContextValue {
  accessTokens: AccessToken[] | undefined;
  refetch: () => Promise<any>;
  loading: boolean;
}

export const ApiContext = createContext<ApiContextValue | undefined>(undefined);

export function ApiProvider(props: ApiProviderProps): JSX.Element {
  const { children } = props;
  const { environment } = useAppContext();

  const { data, refetch, loading } = useQuery(ListAccessTokens, {
    variables: { environmentId: environment?.id },
    skip: !environment?.id,
  });

  const accessTokens = data?.listAccessTokens;

  const value: ApiContextValue = {
    accessTokens,
    refetch,
    loading,
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
