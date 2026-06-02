import type { ComponentType } from 'react';
import { BuilderMode, BuilderProvider, useBuilderInit, useBuilderStore } from './core';
import { BannerBuilder } from './builders/banner';
import { ChecklistBuilder } from './builders/checklist';
import { BuilderSideBar, FlowBuilderDetail, FlowBuilderTrigger } from './builders/flow';
import { LauncherBuilder } from './builders/launcher';
import { ResourceCenterBuilder } from './builders/resource-center';
import { WebBuilderLoading } from './components/web-builder-loading';
import { useListsLoading } from './hooks/use-lists-loading';
import { useStepUrlSync } from './hooks/use-step-url-sync';
import { useSyncCurrentTheme } from './hooks/use-sync-current-theme';

// Which component renders for each builder mode. Several sub-modes of the
// same content type point at one builder, which switches internally
// (e.g. LauncherBuilder handles LAUNCHER / LAUNCHER_TARGET / LAUNCHER_TOOLTIP).
// Partial: BuilderMode.NONE (and any unmapped mode) renders nothing.
//
// Module-level const on purpose: a per-render object would change identity
// and remount the active builder every render. This is the composition
// root's job — wiring each mode to its concrete builder — so it lives here
// alongside WebBuilder rather than in core/ (which must not import builders).
const MODE_COMPONENTS: Partial<Record<BuilderMode, ComponentType>> = {
  [BuilderMode.FLOW_STEP_DETAIL]: FlowBuilderDetail,
  [BuilderMode.FLOW_STEP_TRIGGER]: FlowBuilderTrigger,
  [BuilderMode.FLOW]: BuilderSideBar,
  [BuilderMode.LAUNCHER]: LauncherBuilder,
  [BuilderMode.LAUNCHER_TARGET]: LauncherBuilder,
  [BuilderMode.LAUNCHER_TOOLTIP]: LauncherBuilder,
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
  // Accepted for parity with the v1 builder's shared call site in apps/web;
  // web-only v2 has no SDK-preview path that consumes it.
  usertourjsUrl?: string;
  onSaved: () => Promise<void>;
  isLoading?: boolean;
  initialStepIndex?: number;
  shouldShowMadeWith?: boolean;
  onStepIndexChange?: (stepIndex: number | undefined) => void;
}

interface WebBuilderContentProps {
  initialStepIndex?: number;
  onStepIndexChange?: (stepIndex: number | undefined) => void;
}

// The builder, inside BuilderProvider: drives init, observes the shared
// lists' loading, syncs the current theme + the ?step URL, gates on a
// single `ready` signal, then routes to the active mode's component.
function WebBuilderContent(props: WebBuilderContentProps) {
  const { initialStepIndex, onStepIndexChange } = props;
  const { ready } = useBuilderInit({ initialStepIndex });
  const listsLoading = useListsLoading();
  useStepUrlSync(ready, onStepIndexChange);
  useSyncCurrentTheme();
  const currentMode = useBuilderStore((state) => state.currentMode);

  if (!ready || listsLoading) {
    return <WebBuilderLoading message="Loading builder..." />;
  }

  const Active = MODE_COMPONENTS[currentMode.mode];
  return Active ? <Active /> : null;
}

export const WebBuilder = (props: WebBuilderProps) => {
  const {
    onSaved,
    shouldShowMadeWith,
    environmentId,
    projectId,
    contentId,
    versionId,
    initialStepIndex,
    onStepIndexChange,
  } = props;
  return (
    <BuilderProvider
      onSaved={onSaved}
      shouldShowMadeWith={shouldShowMadeWith}
      environmentId={environmentId}
      projectId={projectId}
      contentId={contentId}
      versionId={versionId}
    >
      <WebBuilderContent
        initialStepIndex={initialStepIndex}
        onStepIndexChange={onStepIndexChange}
      />
    </BuilderProvider>
  );
};

WebBuilder.displayName = 'WebBuilder';
