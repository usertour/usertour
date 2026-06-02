import { ContentDataType } from '@usertour/types';
import { BuilderProvider, useBuilderInit, useBuilderStore } from './core';
import { BannerBuilder } from './builders/banner';
import { ChecklistRouter } from './builders/checklist';
import { FlowRouter } from './builders/flow';
import { LauncherRouter } from './builders/launcher';
import { ResourceCenterRouter } from './builders/resource-center';
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
      return <FlowRouter />;
    case ContentDataType.LAUNCHER:
      return <LauncherRouter />;
    case ContentDataType.CHECKLIST:
      return <ChecklistRouter />;
    case ContentDataType.RESOURCE_CENTER:
      return <ResourceCenterRouter />;
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
