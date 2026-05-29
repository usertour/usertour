import { useQuery } from '@apollo/client';
import { listAttributes } from '@usertour/gql';
import { Attribute } from '@usertour/types';
import { ReactNode, createContext, useContext } from 'react';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';

export interface AttributeListProviderProps {
  children?: ReactNode;
  projectId: string | undefined;
}

export interface AttributeListContextValue {
  attributeList: Attribute[] | undefined;
  refetch: any;
  loading: boolean;
}
export const AttributeListContext = createContext<AttributeListContextValue | undefined>(undefined);

export function AttributeListProvider(props: AttributeListProviderProps): JSX.Element {
  const { children, projectId } = props;
  // SHARED_CACHE_QUERY_OPTIONS so consumers of this provider (activity
  // feed, content builder, autostart rules) see attribute mutations
  // — without it the global no-cache default keeps this observable
  // isolated from useDeleteAttributeMutation's cache.evict.
  const { data, refetch, loading } = useQuery(listAttributes, {
    variables: { projectId: projectId, bizType: 0 },
    ...SHARED_CACHE_QUERY_OPTIONS,
  });

  const attributeList = data?.listAttributes;
  const value: AttributeListContextValue = {
    attributeList,
    refetch,
    loading,
  };

  return <AttributeListContext.Provider value={value}>{children}</AttributeListContext.Provider>;
}

export function useAttributeListContext(): AttributeListContextValue {
  const context = useContext(AttributeListContext);
  if (!context) {
    throw new Error('useAttributeListContext must be used within a AttributeListProvider.');
  }
  return context;
}
