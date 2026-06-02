// Mode enum + per-mode payload types. Kept as its own module (not folded
// into the store or the barrel) to avoid a cycle: both `builder-store.ts`
// and the core barrel (`index.ts`) import `BuilderMode` from here, and the
// barrel re-exports it so consumers have one import path.

import { ContentDataType } from '@usertour/types';

export enum BuilderMode {
  FLOW_STEP_DETAIL = 'flow-step-detail',
  FLOW_STEP_TRIGGER = 'flow-step-trigger',
  FLOW = 'flow',
  LAUNCHER = 'launcher',
  CHECKLIST = 'checklist',
  BANNER = 'banner',
  RESOURCE_CENTER = 'resource-center',
  LAUNCHER_TARGET = 'launcher-target',
  LAUNCHER_TOOLTIP = 'launcher-tooltip',
  CHECKLIST_ITEM = 'checklist-item',
  RESOURCE_CENTER_BLOCK = 'resource-center-block',
  RESOURCE_CENTER_TAB = 'resource-center-tab',
  NONE = 'none',
}

export interface BuilderTriggerMode {
  mode: BuilderMode.FLOW_STEP_TRIGGER;
  data?: any;
}

export interface BuilderCommonMode {
  mode: Exclude<BuilderMode, BuilderMode.FLOW_STEP_TRIGGER>;
  data?: any;
}

export type CurrentMode = BuilderCommonMode | BuilderTriggerMode;

// Initial builder mode for a content type — the single source for the
// type→mode mapping. (app/mode-component-map then maps the resulting
// mode → component.) Unmapped types (e.g. TRACKER) fall back to FLOW,
// matching pre-C3 behaviour.
const CONTENT_TYPE_TO_MODE: Partial<Record<ContentDataType, BuilderMode>> = {
  [ContentDataType.FLOW]: BuilderMode.FLOW,
  [ContentDataType.CHECKLIST]: BuilderMode.CHECKLIST,
  [ContentDataType.LAUNCHER]: BuilderMode.LAUNCHER,
  [ContentDataType.BANNER]: BuilderMode.BANNER,
  [ContentDataType.RESOURCE_CENTER]: BuilderMode.RESOURCE_CENTER,
};

export const deriveInitialMode = (contentType: string): BuilderMode =>
  CONTENT_TYPE_TO_MODE[contentType as ContentDataType] ?? BuilderMode.FLOW;
