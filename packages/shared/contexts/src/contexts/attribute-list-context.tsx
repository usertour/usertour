import { useQuery } from '@apollo/client';
import { listAttributes } from '@usertour-ui/gql';
import { Attribute } from '@usertour-ui/types';
import { ReactNode, createContext, useContext } from 'react';

export interface AttributeListProviderProps {
  children?: ReactNode;
  projectId: string | undefined;
}

export interface AttributeListContextValue {
  attributeList: Attribute[] | undefined;
  refetch: any;
}
export const AttributeListContext = createContext<AttributeListContextValue | undefined>(undefined);

export function AttributeListProvider(props: AttributeListProviderProps): JSX.Element {
  const { children, projectId } = props;
  const { data, refetch } = useQuery(listAttributes, {
    variables: { projectId: projectId, bizType: 0 },
  });

  const attributeList = data?.listAttributes;
  const value: AttributeListContextValue = {
    attributeList,
    refetch,
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
