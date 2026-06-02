import { ContentDataType } from '@usertour/types';
import { BuilderProvider, useBuilderInit, useBuilderStore } from './core';
import { BannerBuilder } from './builders/banner';
import { ChecklistBuilder } from './builders/checklist';
import { FlowBuilder } from './builders/flow';
import { LauncherBuilder } from './builders/launcher';
import { ResourceCenterBuilder } from './builders/resource-center';
import { WebBuilderLoading } from './components/web-builder-loading';
import { useListsLoading } from './hooks/use-lists-loading';
import { useSyncCurrentTheme } from './hooks/use-sync-current-theme';

export interface WebBuilderProps {
  contentId: string;
  environmentId: string;
  versionId: string;
  projectId: string;
  onSaved: () => Promise<void>;
  shouldShowMadeWith?: boolean;
}

// The builder, inside BuilderProvider: drives init, observes the shared lists'
// loading, syncs the theme, gates on `ready`, then dispatches on the content
// type to that type's view. Flow / Launcher / Checklist / ResourceCenter own
// their sub-views via a descendant <Routes> (under the builder route's `/*`);
// Banner is a single view with no sub-routes. The old store `currentMode` +
// MODE_COMPONENTS dispatch is gone — the URL is the view's source of truth.
function WebBuilderContent() {
  const { ready } = useBuilderInit();
  const listsLoading = useListsLoading();
  useSyncCurrentTheme();
  const currentContent = useBuilderStore((state) => state.currentContent);

  if (!ready || listsLoading) {
    return <WebBuilderLoading message="Loading builder..." />;
  }

  switch (currentContent?.type) {
    case ContentDataType.FLOW:
      return <FlowBuilder />;
    case ContentDataType.LAUNCHER:
      return <LauncherBuilder />;
    case ContentDataType.CHECKLIST:
      return <ChecklistBuilder />;
    case ContentDataType.RESOURCE_CENTER:
      return <ResourceCenterBuilder />;
    case ContentDataType.BANNER:
      return <BannerBuilder />;
    default:
      return null;
  }
}

export const WebBuilder = (props: WebBuilderProps) => (
  <BuilderProvider {...props}>
    <WebBuilderContent />
  </BuilderProvider>
);

WebBuilder.displayName = 'WebBuilder';
