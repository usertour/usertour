// Mode enum + per-mode payload types — extracted from builder-context
// to break the cycle between `builder-context.tsx` and the Zustand
// store factory (`store/builder-store.ts`). Both files import from
// here; `builder-context.tsx` re-exports `BuilderMode` so consumers
// have one import path.

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
