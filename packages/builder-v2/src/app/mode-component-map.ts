import type { ComponentType } from 'react';
import { BuilderMode } from '../contexts/builder-mode';
import { BannerBuilder } from '../pages/banner';
import { ChecklistBuilder } from '../pages/checklist';
import { FlowBuilderDetail, FlowBuilderTrigger } from '../pages/flow';
import { LauncherBuilder } from '../pages/launcher';
import { ResourceCenterBuilder } from '../pages/resource-center';
import { BuilderSideBar } from '../pages/sidebar';

// Which component renders for each builder mode. Several sub-modes of the
// same content type point at one builder, which switches internally
// (e.g. LauncherBuilder handles LAUNCHER / LAUNCHER_TARGET / LAUNCHER_TOOLTIP).
// Partial: BuilderMode.NONE (and any unmapped mode) renders nothing —
// `Container` falls back to null, matching the old `return <></>`.
//
// Module-level const on purpose: a per-render object would change identity
// and remount the active page every render.
export const MODE_COMPONENTS: Partial<Record<BuilderMode, ComponentType>> = {
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
