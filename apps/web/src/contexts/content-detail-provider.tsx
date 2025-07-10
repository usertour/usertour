import { ReactNode, createContext, useContext } from 'react';
import { useAppContext } from './app-context';
import { useContentDetailContext } from './content-detail-context';
import { useContentListContext } from './content-list-context';
import { useContentVersionContext } from './content-version-context';
import { useContentVersionListContext } from './content-version-list-context';
import { useSegmentListContext } from './segment-list-context';
import { useThemeListContext } from './theme-list-context';
import { ContentDetailProvider } from './content-detail-context';
import { ContentListProvider } from './content-list-context';
import { ContentVersionProvider } from './content-version-context';
import { ContentVersionListProvider } from './content-version-list-context';
import { SegmentListProvider } from './segment-list-context';
import { ThemeListProvider } from './theme-list-context';
import { ContentTypeName } from '@usertour-ui/types';

export interface ContentDetailProviderProps {
  children: ReactNode;
  contentId: string;
  contentType: ContentTypeName;
}

export interface ContentDetailProviderValue {
  isLoading: boolean;
}

const ContentDetailProviderContext = createContext<ContentDetailProviderValue | undefined>(
  undefined,
);

// Inner component to access all provider contexts and combine loading states
function ContentDetailContent({ children }: { children: ReactNode }) {
  const { loading: contentDetailLoading, content } = useContentDetailContext();
  const { isLoading: contentListLoading } = useContentListContext();
  const { loading: contentVersionLoading, version } = useContentVersionContext();
  const { loading: contentVersionListLoading, versionList } = useContentVersionListContext();
  const { loading: segmentListLoading } = useSegmentListContext();
  const { loading: themeListLoading } = useThemeListContext();

  // For ContentDetailContext: only show loading if it's initial load (no content data yet)
  const isContentDetailInitialLoading = contentDetailLoading && !content;

  // For ContentVersionContext: only show loading if it's initial load (no version data yet)
  const isContentVersionInitialLoading = contentVersionLoading && !version;

  // For ContentVersionListContext: only show loading if it's initial load (no versionList data yet)
  const isContentVersionListInitialLoading = contentVersionListLoading && versionList.length === 0;

  // Other contexts can show loading normally as they are less likely to refresh frequently
  const isOtherLoading = contentListLoading || segmentListLoading || themeListLoading;

  const isLoading =
    isContentDetailInitialLoading ||
    isContentVersionInitialLoading ||
    isContentVersionListInitialLoading ||
    isOtherLoading;

  const value: ContentDetailProviderValue = {
    isLoading,
  };

  return (
    <ContentDetailProviderContext.Provider value={value}>
      {children}
    </ContentDetailProviderContext.Provider>
  );
}

export function ContentDetailProviderWrapper(props: ContentDetailProviderProps): JSX.Element {
  const { children, contentId, contentType } = props;
  const { project, environment } = useAppContext();

  return (
    <SegmentListProvider environmentId={environment?.id} bizType={['COMPANY', 'USER']}>
      <ContentListProvider
        environmentId={environment?.id}
        key={'environmentId'}
        contentType={contentType}
        defaultPagination={{ pageSize: 100, pageIndex: 0 }}
      >
        <ContentDetailProvider contentId={contentId} contentType={contentType}>
          <ContentVersionProvider>
            <ContentVersionListProvider contentId={contentId}>
              <ThemeListProvider projectId={project?.id}>
                <ContentDetailContent>{children}</ContentDetailContent>
              </ThemeListProvider>
            </ContentVersionListProvider>
          </ContentVersionProvider>
        </ContentDetailProvider>
      </ContentListProvider>
    </SegmentListProvider>
  );
}

export function useContentDetailProviderWrapper(): ContentDetailProviderValue {
  const context = useContext(ContentDetailProviderContext);
  if (!context) {
    throw new Error(
      'useContentDetailProviderWrapper must be used within a ContentDetailProviderWrapper.',
    );
  }
  return context;
}
