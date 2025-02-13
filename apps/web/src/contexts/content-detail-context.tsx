import { useQuery } from '@apollo/client';
import { getContent } from '@usertour-ui/gql';
import { Content } from '@usertour-ui/types';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

export interface ContentDetailProviderProps {
  children: ReactNode;
  contentId: string;
  contentType: string | undefined;
}

export interface ContentDetailContextValue {
  content: Content | null;
  refetch: any;
  contentType: string | undefined;
}
export const ContentDetailContext = createContext<ContentDetailContextValue | undefined>(undefined);

export function ContentDetailProvider(props: ContentDetailProviderProps): JSX.Element {
  const { children, contentId, contentType } = props;
  const [content, setContent] = useState<Content | null>(null);
  const { data, refetch } = useQuery(getContent, {
    variables: { contentId },
  });

  useEffect(() => {
    if (data?.getContent) {
      setContent(data.getContent);
    }
  }, [data?.getContent]);

  const value: ContentDetailContextValue = {
    content,
    refetch,
    contentType,
  };

  return <ContentDetailContext.Provider value={value}>{children}</ContentDetailContext.Provider>;
}

export function useContentDetailContext(): ContentDetailContextValue {
  const context = useContext(ContentDetailContext);
  if (!context) {
    throw new Error('useContentDetailContext must be used within a ContentDetailProvider.');
  }
  return context;
}
