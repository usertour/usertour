import { ReactNode, createContext, useContext } from 'react';
import {
  AttributeListProvider,
  useAttributeListContext,
  useContentListContext,
  useThemeListContext,
} from '@usertour-ui/contexts';
import { ContentListProvider } from '@usertour-ui/contexts';
import { ThemeListProvider } from '@usertour-ui/contexts';
import { BuilderProvider } from './builder-context';
import { LauncherProvider } from './launcher-context';
import { ChecklistProvider } from './checklist-context';

export interface WebBuilderProviderProps {
  children: ReactNode;
  contentId: string;
  environmentId: string;
  versionId: string;
  projectId: string;
  envToken: string;
  onSaved: () => Promise<void>;
  usertourjsUrl?: string;
}

export interface WebBuilderProviderValue {
  isLoading: boolean;
}

const WebBuilderProviderContext = createContext<WebBuilderProviderValue | undefined>(undefined);

// Inner component to access builder context and provide loading state
function WebBuilderContent({ children }: { children: ReactNode }) {
  const { loading: attributeListLoading } = useAttributeListContext();
  const { loading: contentListLoading } = useContentListContext();
  const { loading: themeListLoading } = useThemeListContext();

  const value: WebBuilderProviderValue = {
    isLoading: attributeListLoading || contentListLoading || themeListLoading,
  };

  return (
    <WebBuilderProviderContext.Provider value={value}>
      {children}
    </WebBuilderProviderContext.Provider>
  );
}

export function WebBuilderProvider(props: WebBuilderProviderProps): JSX.Element {
  const { children, environmentId, projectId, onSaved, usertourjsUrl } = props;

  return (
    <BuilderProvider isWebBuilder={true} onSaved={onSaved} usertourjsUrl={usertourjsUrl}>
      <LauncherProvider>
        <ChecklistProvider>
          <ThemeListProvider projectId={projectId}>
            <AttributeListProvider projectId={projectId}>
              <ContentListProvider
                environmentId={environmentId}
                key={'environmentId'}
                contentType={undefined}
                defaultQuery={{}}
                defaultPagination={{
                  pageSize: 1000,
                  pageIndex: 0,
                }}
              >
                <WebBuilderContent>{children}</WebBuilderContent>
              </ContentListProvider>
            </AttributeListProvider>
          </ThemeListProvider>
        </ChecklistProvider>
      </LauncherProvider>
    </BuilderProvider>
  );
}

export function useWebBuilderProvider(): WebBuilderProviderValue {
  const context = useContext(WebBuilderProviderContext);
  if (!context) {
    throw new Error('useWebBuilderProvider must be used within a WebBuilderProvider.');
  }
  return context;
}
