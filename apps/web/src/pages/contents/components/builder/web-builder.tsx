import type { ComponentType } from 'react';
import { ContentDataType } from '@usertour/types';
import { BuilderMode, BuilderProvider, useBuilderInit, useBuilderStore } from './core';
import { BannerBuilder } from './builders/banner';
import { ChecklistBuilder } from './builders/checklist';
import { FlowRouter } from './builders/flow';
import { LauncherRouter } from './builders/launcher';
import { ResourceCenterBuilder } from './builders/resource-center';
import { WebBuilderLoading } from './components/web-builder-loading';
import { useListsLoading } from './hooks/use-lists-loading';
import { useSyncCurrentTheme } from './hooks/use-sync-current-theme';

// Mode→component dispatch for the still-store-mode-driven types (Checklist /
// Banner / ResourceCenter). Flow and Launcher have moved to route-driven
// views (FlowRouter / LauncherRouter, descendant <Routes>); the remaining
// types migrate in later phases, after which this map and `currentMode` are
// removed.
const MODE_COMPONENTS: Partial<Record<BuilderMode, ComponentType>> = {
  [BuilderMode.CHECKLIST]: ChecklistBuilder,
  [BuilderMode.CHECKLIST_ITEM]: ChecklistBuilder,
  [BuilderMode.BANNER]: BannerBuilder,
  [BuilderMode.RESOURCE_CENTER]: ResourceCenterBuilder,
  [BuilderMode.RESOURCE_CENTER_BLOCK]: ResourceCenterBuilder,
  [BuilderMode.RESOURCE_CENTER_TAB]: ResourceCenterBuilder,
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
// loading, syncs the theme, gates on `ready`, then hands off the view. Flow and
// Launcher are route-driven — their routers own sub-views via a descendant
// <Routes> under the builder route's `/*`; the other types still dispatch on
// currentMode until their route phases land.
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

  const Active = MODE_COMPONENTS[currentMode.mode];
  return Active ? <Active /> : null;
}

export const WebBuilder = (props: WebBuilderProps) => (
  <BuilderProvider {...props}>
    <WebBuilderContent />
  </BuilderProvider>
);

WebBuilder.displayName = 'WebBuilder';
