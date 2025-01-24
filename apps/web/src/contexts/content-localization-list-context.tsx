import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useQuery } from "@apollo/client";
import { findManyVersionLocations } from "@usertour-ui/gql";
import { VersionOnLocalization } from "@usertour-ui/types";

export interface ContentLocalizationListProviderProps {
  children: ReactNode;
  versionId: string;
}

export interface ContentLocalizationListContextValue {
  contentLocalizationList: VersionOnLocalization[];
  refetch: any;
  loading: boolean;
}

export const ContentLocalizationListContext = createContext<
  ContentLocalizationListContextValue | undefined
>(undefined);

export function ContentLocalizationListProvider(
  props: ContentLocalizationListProviderProps
): JSX.Element {
  const { children, versionId } = props;
  const [contentLocalizationList, setContentLocalizationList] = useState<
    VersionOnLocalization[]
  >([]);

  const { data, refetch, loading } = useQuery(findManyVersionLocations, {
    variables: { versionId },
  });

  useEffect(() => {
    if (data && data.findManyVersionLocations) {
      setContentLocalizationList(data.findManyVersionLocations);
    }
  }, [data]);

  const value: ContentLocalizationListContextValue = {
    contentLocalizationList,
    refetch,
    loading,
  };

  return (
    <ContentLocalizationListContext.Provider value={value}>
      {children}
    </ContentLocalizationListContext.Provider>
  );
}

export function useContentLocalizationListContext(): ContentLocalizationListContextValue {
  const context = useContext(ContentLocalizationListContext);
  if (!context) {
    throw new Error(
      `useContentLocalizationListContext must be used within a ContentLocalizationListProvider.`
    );
  }
  return context;
}
