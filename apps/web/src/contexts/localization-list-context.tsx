import { useQuery } from '@apollo/client';
import { listLocalizations } from '@usertour-packages/gql';
import { Localization } from '@usertour-packages/types';
import { ReactNode, createContext, useContext } from 'react';

export interface LocalizationListProviderProps {
  children?: ReactNode;
  projectId: string | undefined;
}

export interface LocalizationListContextValue {
  localizationList: Localization[] | undefined;
  refetch: any;
  loading: boolean;
}
export const LocalizationListContext = createContext<LocalizationListContextValue | undefined>(
  undefined,
);

export function LocalizationListProvider(props: LocalizationListProviderProps): JSX.Element {
  const { children, projectId } = props;
  const { data, refetch, loading } = useQuery(listLocalizations, {
    variables: { projectId: projectId },
  });

  const localizationList = data?.listLocalizations;
  const value: LocalizationListContextValue = {
    localizationList,
    refetch,
    loading,
  };

  return (
    <LocalizationListContext.Provider value={value}>{children}</LocalizationListContext.Provider>
  );
}

export function useLocalizationListContext(): LocalizationListContextValue {
  const context = useContext(LocalizationListContext);
  if (!context) {
    throw new Error('useLocalizationListContext must be used within a LocalizationListProvider.');
  }
  return context;
}
