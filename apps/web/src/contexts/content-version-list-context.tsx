import { useQuery } from '@apollo/client';
import { listContentVersions } from '@usertour-ui/gql';
import { ContentVersion } from '@usertour-ui/types';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

export interface ContentVersionListProviderProps {
  children: ReactNode;
  contentId: string;
}

export interface ContentVersionListContextValue {
  versionList: ContentVersion[];
  loading: boolean;
  refetch: any;
}

export const ContentVersionListContext = createContext<ContentVersionListContextValue | undefined>(
  undefined,
);

export function ContentVersionListProvider(props: ContentVersionListProviderProps): JSX.Element {
  const { children, contentId } = props;
  const [versionList, setVersionList] = useState<ContentVersion[]>([]);

  const { data, refetch, loading } = useQuery(listContentVersions, {
    variables: { contentId: contentId },
  });

  useEffect(() => {
    if (data?.listContentVersions) {
      setVersionList(data.listContentVersions);
    }
  }, [data]);

  useEffect(() => {
    if (contentId) {
      refetch();
    }
  }, [contentId]);

  const value: ContentVersionListContextValue = {
    versionList,
    loading,
    refetch,
  };

  return (
    <ContentVersionListContext.Provider value={value}>
      {versionList && children}
    </ContentVersionListContext.Provider>
  );
}

export function useContentVersionListContext(): ContentVersionListContextValue {
  const context = useContext(ContentVersionListContext);
  if (!context) {
    throw new Error(
      'useContentVersionListContext must be used within a ContentVersionListProvider.',
    );
  }
  return context;
}
