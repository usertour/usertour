import type { ComponentType } from 'react';
import { BuilderMode, BuilderProvider, useBuilderInit, useBuilderStore } from './core';
import { BannerBuilder } from './builders/banner';
import { ChecklistBuilder } from './builders/checklist';
import { BuilderSideBar, FlowBuilderDetail, FlowBuilderTrigger } from './builders/flow';
import { LauncherBuilder } from './builders/launcher';
import { ResourceCenterBuilder } from './builders/resource-center';
import { WebBuilderLoading } from './components/web-builder-loading';
import { useListsLoading } from './hooks/use-lists-loading';
import { useStepUrlParam, useStepUrlSync } from './hooks/use-step-url';
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
  onSaved: () => Promise<void>;
  shouldShowMadeWith?: boolean;
}

// The builder, inside BuilderProvider: drives init (seeded by the `?step`
// deep-link), observes the shared lists' loading, mirrors the active step
// back to `?step`, syncs the theme, gates on a single `ready` signal, then
// routes to the active mode's component.
function WebBuilderContent() {
  const initialStepIndex = useStepUrlParam();
  const { ready } = useBuilderInit({ initialStepIndex });
  const listsLoading = useListsLoading();
  useStepUrlSync(ready);
  useSyncCurrentTheme();
  const currentMode = useBuilderStore((state) => state.currentMode);

  if (!ready || listsLoading) {
    return <WebBuilderLoading message="Loading builder..." />;
  }

  const Active = MODE_COMPONENTS[currentMode.mode];
  return Active ? <Active /> : null;
}

// WebBuilder is a thin wrapper: its props are exactly BuilderProvider's
// config, so they forward wholesale. (If a prop that ISN'T provider config
// is ever added here, switch back to explicit forwarding — JSX spread
// bypasses excess-property checks and would leak it into the Provider.)
export const WebBuilder = (props: WebBuilderProps) => (
  <BuilderProvider {...props}>
    <WebBuilderContent />
  </BuilderProvider>
);

WebBuilder.displayName = 'WebBuilder';
