import { ReactNode, createContext, useContext } from 'react';
import { BuilderProvider } from './builder-context';
import { ChecklistProvider } from './checklist-context';
import { LauncherProvider } from './launcher-context';
import { ResourceCenterProvider } from './resource-center-context';
import { useAttributeList } from '../hooks/use-attribute-list';
import { useContentList } from '../hooks/use-content-list';
import { useThemeList } from '../hooks/use-theme-list';

export interface WebBuilderProviderProps {
  children: ReactNode;
  contentId: string;
  environmentId: string;
  versionId: string;
  projectId: string;
  envToken: string;
  onSaved: () => Promise<void>;
  usertourjsUrl?: string;
  shouldShowMadeWith?: boolean;
}

export interface WebBuilderProviderValue {
  isLoading: boolean;
}

const WebBuilderProviderContext = createContext<WebBuilderProviderValue | undefined>(undefined);

// Aggregates the loading state of the three upstream data hooks (theme
// / attribute / content list). Replaces what used to be three nested
// `<XxxListProvider>` wrappers — the hooks read projectId / environmentId
// from the Zustand store and Apollo's normalized cache deduplicates
// requests across every other consumer in the builder tree.
function WebBuilderContent({ children }: { children: ReactNode }) {
  const { loading: themeListLoading } = useThemeList();
  const { loading: attributeListLoading } = useAttributeList();
  const { loading: contentListLoading } = useContentList();

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
  const { children, onSaved, usertourjsUrl, shouldShowMadeWith } = props;

  return (
    <BuilderProvider
      isWebBuilder={true}
      onSaved={onSaved}
      usertourjsUrl={usertourjsUrl}
      shouldShowMadeWith={shouldShowMadeWith}
    >
      <LauncherProvider>
        <ChecklistProvider>
          <ResourceCenterProvider>
            <WebBuilderContent>{children}</WebBuilderContent>
          </ResourceCenterProvider>
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
