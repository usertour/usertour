import type { ComponentType } from 'react';
import { ContentDataType } from '@usertour/types';
import { BuilderMode, BuilderProvider, useBuilderInit, useBuilderStore } from './core';
import { BannerBuilder } from './builders/banner';
import { ChecklistRouter } from './builders/checklist';
import { FlowRouter } from './builders/flow';
import { LauncherRouter } from './builders/launcher';
import { ResourceCenterRouter } from './builders/resource-center';
import { WebBuilderLoading } from './components/web-builder-loading';
import { useListsLoading } from './hooks/use-lists-loading';
import { useSyncCurrentTheme } from './hooks/use-sync-current-theme';

// Mode→component dispatch for the still-store-mode-driven types. Flow /
// Launcher / Checklist / ResourceCenter have moved to route-driven views
// (their routers, descendant <Routes>); only Banner (a single view) still
// dispatches on currentMode — it migrates in phase 5, after which this map and
// `currentMode` are removed.
const MODE_COMPONENTS: Partial<Record<BuilderMode, ComponentType>> = {
  [BuilderMode.BANNER]: BannerBuilder,
};

export interface WebBuilderProps {
  contentId: string;
  environmentId: string;
  versionId: string;
  projectId: string;
  onSaved: () => Promise<void>;
  shouldShowMadeWith?: boolean;
}

// The builder, inside BuilderProvider: drives init, observes the shared lists'
// loading, syncs the theme, gates on `ready`, then hands off the view. Flow,
// Launcher, Checklist and ResourceCenter are route-driven — their routers own
// sub-views via a descendant <Routes> under the builder route's `/*`; Banner
// still dispatches on currentMode until its route phase lands.
function WebBuilderContent() {
  const { ready } = useBuilderInit({});
  const listsLoading = useListsLoading();
  useSyncCurrentTheme();
  const currentContent = useBuilderStore((state) => state.currentContent);
  const currentMode = useBuilderStore((state) => state.currentMode);

  if (!ready || listsLoading) {
    return <WebBuilderLoading message="Loading builder..." />;
  }

  if (currentContent?.type === ContentDataType.FLOW) {
    return <FlowRouter />;
  }
  if (currentContent?.type === ContentDataType.LAUNCHER) {
    return <LauncherRouter />;
  }
  if (currentContent?.type === ContentDataType.CHECKLIST) {
    return <ChecklistRouter />;
  }
  if (currentContent?.type === ContentDataType.RESOURCE_CENTER) {
    return <ResourceCenterRouter />;
  }

  const Active = MODE_COMPONENTS[currentMode.mode];
  return Active ? <Active /> : null;
}

export const WebBuilder = (props: WebBuilderProps) => (
  <BuilderProvider {...props}>
    <WebBuilderContent />
  </BuilderProvider>
);

WebBuilder.displayName = 'WebBuilder';
