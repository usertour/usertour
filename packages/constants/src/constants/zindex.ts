// Builder authoring z-index layers, low → high. They sit well above the admin
// app so editing overlays stack correctly relative to each other. The base is
// fixed (no per-instance offset): the builder is a full-screen takeover, so use
// these directly. The production widget has its own scale (WidgetZIndex).
export const BUILDER_Z = {
  canvas: 10900, // preview widget on the canvas
  panel: 11000, // floating sidebar / inspector panels
  popover: 11001, // selects / popovers opened from a panel
  rulesDialog: 11002, // rules sub-dialog
  rules: 11003, // condition / action rule editors
  previewDialog: 11100, // top-level preview dialog
} as const;

export const EDITOR_OVERLAY = 10901;
export const EDITOR_SELECT = 10902;
export const EDITOR_SIDEBAR = 10903;
export const EDITOR_RICH_TOOLBAR = 10904;
export const EDITOR_RICH_TOOLBAR_MORE = 10905;
export const EDITOR_RICH_ACTION = 10906;
export const EDITOR_RICH_ACTION_CONTENT = 10907;

export const PREVIEW_BASIC = 1;

/**
 * Widget z-index offsets relative to base z-index
 */
export enum WidgetZIndex {
  BASE = 1000000,
  TOUR_OFFSET = 200,
  RESOURCE_CENTER_OFFSET = 150,
  CHECKLIST_OFFSET = 100,
  LAUNCHER_OFFSET = 0,
}

/**
 * Rules component z-index layer offsets relative to baseZIndex
 */
export enum RulesZIndexOffset {
  POPOVER = 0,
  DROPDOWN = 0,
  COMBOBOX = 0,
  ERROR = 1,
}

/**
 * Web app z-index values
 */
export enum WebZIndex {
  RULES = 50,
}
