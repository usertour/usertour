import { ReactNode, createContext, useContext } from 'react';
import { BuilderProvider } from './builder-provider';
import { useAttributeList } from '../hooks/use-attribute-list';
import { useContentList } from '../hooks/use-content-list';
import { useThemeList } from '../hooks/use-theme-list';

export interface WebBuilderProviderProps {
  children: ReactNode;
  contentId: string;
  environmentId: string;
  versionId: string;
  projectId: string;
  onSaved: () => Promise<void>;
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
  const { children, onSaved, shouldShowMadeWith, environmentId, projectId } = props;

  return (
    <BuilderProvider
      onSaved={onSaved}
      shouldShowMadeWith={shouldShowMadeWith}
      environmentId={environmentId}
      projectId={projectId}
    >
      <WebBuilderContent>{children}</WebBuilderContent>
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
