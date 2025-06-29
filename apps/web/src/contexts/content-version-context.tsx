import { useQuery } from '@apollo/client';
import { getContentVersion } from '@usertour-ui/gql';
import { ContentVersion } from '@usertour-ui/types';
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useContentDetailContext } from './content-detail-context';

export interface ContentVersionProviderProps {
  children: ReactNode;
}

export interface ContentVersionContextValue {
  version: ContentVersion | null;
  loading: boolean;
  refetch: any;
  isSaveing: boolean;
  setIsSaveing: Dispatch<SetStateAction<boolean>>;
}
export const ContentVersionContext = createContext<ContentVersionContextValue | undefined>(
  undefined,
);

export function ContentVersionProvider(props: ContentVersionProviderProps): JSX.Element {
  const { children } = props;
  const { content } = useContentDetailContext();
  const [version, setVersion] = useState<ContentVersion | null>(null);
  const [isSaveing, setIsSaveing] = useState<boolean>(false);
  const { data, refetch, loading } = useQuery(getContentVersion, {
    variables: { versionId: content?.editedVersionId },
  });

  useEffect(() => {
    if (data?.getContentVersion) {
      setVersion(data.getContentVersion);
    }
  }, [data]);

  useEffect(() => {
    if (content?.editedVersionId) {
      refetch();
    }
  }, [content?.editedVersionId]);

  const value: ContentVersionContextValue = {
    isSaveing,
    setIsSaveing,
    version,
    loading,
    refetch,
  };

  return (
    <ContentVersionContext.Provider value={value}>
      {version && children}
    </ContentVersionContext.Provider>
  );
}

export function useContentVersionContext(): ContentVersionContextValue {
  const context = useContext(ContentVersionContext);
  if (!context) {
    throw new Error('useContentVersionContext must be used within a ContentVersionProvider.');
  }
  return context;
}
