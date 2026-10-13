import type { ContentConfigObject, RulesCondition } from './config';

// ============================================================================
// Enums
// ============================================================================

export enum BuilderType {
  EXTENSION = 'extension',
  WEB = 'web',
  ALL = 'all',
}

export enum ContentActionsItemType {
  STEP_GOTO = 'step-goto',
  FLOW_DISMIS = 'flow-dismis',
  LAUNCHER_DISMIS = 'launcher-dismis',
  CHECKLIST_DISMIS = 'checklist-dismis',
  BANNER_DISMIS = 'banner-dismis',
  FLOW_START = 'flow-start',
  PAGE_NAVIGATE = 'page-navigate',
  JAVASCRIPT_EVALUATE = 'javascript-evaluate',
}

export enum ContentDataType {
  CHECKLIST = 'checklist',
  FLOW = 'flow',
  LAUNCHER = 'launcher',
  BANNER = 'banner',
  TRACKER = 'tracker',
  RESOURCE_CENTER = 'resource-center',
  ANNOUNCEMENT = 'announcement',
}

export enum ContentTypeName {
  CHECKLISTS = 'checklists',
  FLOWS = 'flows',
  LAUNCHERS = 'launchers',
  RESOURCE_CENTERS = 'resource-centers',
  BANNERS = 'banners',
  TRACKERS = 'trackers',
  ANNOUNCEMENTS = 'announcements',
}

export enum LauncherDataType {
  BEACON = 'beacon',
  ICON = 'icon',
  HIDDEN = 'hidden',
  BUTTON = 'button',
}

export enum ModalPosition {
  LeftTop = 'leftTop',
  CenterTop = 'centerTop',
  RightTop = 'rightTop',
  LeftCenter = 'leftCenter',
  Center = 'center',
  RightCenter = 'rightCenter',
  LeftBottom = 'leftBottom',
  CenterBottom = 'centerBottom',
  RightBottom = 'rightBottom',
}

export enum StepContentType {
  TOOLTIP = 'tooltip',
  MODAL = 'modal',
  HIDDEN = 'hidden',
  BUBBLE = 'bubble',
}

// ============================================================================
// Base Types
// ============================================================================

export type TargetData = {
  width: number;
  height: number;
  left: number;
  top: number;
  failed?: boolean;
};

export type StepScreenshot = {
  full: string;
  mini: string;
};

// ============================================================================
// Step Types
// ============================================================================

export type StepTrigger = {
  id: string;
  actions: RulesCondition[];
  conditions: RulesCondition[];
  wait?: number;
};

export type StepSettings = {
  width?: number; // undefined means use theme default width (Auto)
  height: number;
  skippable: boolean;
  enabledBackdrop: boolean;
  enabledBlockTarget: boolean;
  explicitCompletionStep?: boolean;
  align: string;
  side: string;
  alignType: string;
  sideOffset: number;
  alignOffset: number;
  position: string;
  positionOffsetX: number;
  positionOffsetY: number;
};

export type Step = {
  id?: string;
  name: string;
  type: string;
  cvid?: string;
  // null = explicitly "inherit the flow theme". Must be null, not undefined:
  // undefined drops out of the save payload and never clears a saved theme.
  themeId?: string | null;
  target: ElementSelectorPropsData;
  screenshot?: StepScreenshot | null;
  createdAt?: string;
  updatedAt?: string;
  trigger?: StepTrigger[] | null;
  sequence: number;
  setting: StepSettings;
  data: any;
};

// ============================================================================
// Content Types
// ============================================================================

export type ContentVersion = {
  id: string;
  createdAt: string;
  updatedAt: string;
  contentId: string;
  themeId: string | null;
  config: ContentConfigObject | null;
  data: any;
  sequence: number;
  /** Absent on list rows; null when the server did not load the steps. */
  steps?: Step[] | null;
  scheduledAt?: string | null;
  /** Non-null = frozen (stamped on first publish, never cleared; forks don't inherit it). */
  publishedAt?: string | null;
  /** Author attribution (null for rows predating it). */
  createdByUserId?: string | null;
  updatedByUserId?: string | null;
  updatedByName?: string | null;
};

/** One publish / unpublish event (per-content Publish history panel). */
export type ContentPublishRecord = {
  id: string;
  createdAt: string;
  contentId: string;
  versionId: string;
  /** Raw sequence — display as v{versionSequence + 1}, matching version rows. */
  versionSequence: number;
  environmentId: string;
  environmentName?: string | null;
  action: 'publish' | 'unpublish';
  actorUserId?: string | null;
  actorTokenId?: string | null;
  actorName?: string | null;
  actorTokenName?: string | null;
};

/** The identity and timestamps of a version, as a content's relations carry it. */
export type ContentVersionSummary = Pick<
  ContentVersion,
  'id' | 'sequence' | 'createdAt' | 'updatedAt'
>;

export type ContentOnEnvironment = {
  id: string;
  environment: {
    id: string;
    name: string;
  };
  environmentId: string;
  published: boolean;
  publishedAt: string;
  publishedVersionId: string;
  /** Loaded by the content detail query only. */
  publishedVersion?: ContentVersionSummary;
};

/** A content's config object (the server's `ContentConfig` scalar). */
export type ContentConfig = {
  rollWindowConfig?: {
    nps: number;
    rate: number;
    scale: number;
  };
};

export type Content = {
  id: string;
  name: string;
  type: ContentDataType;
  config: ContentConfig | null;
  buildUrl: string | null;
  published: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  environmentId: string;
  editedVersionId: string | null;
  publishedVersionId: string | null;
  /** Relations: present when the document selected them (the list query carries steps and contentOnEnvironments, the detail query publishedVersion, editedVersion and contentOnEnvironments). */
  publishedVersion?: ContentVersionSummary | null;
  editedVersion?: ContentVersion | null;
  steps?: Pick<Step, 'id' | 'name' | 'type' | 'cvid' | 'sequence'>[] | null;
  contentOnEnvironments?: ContentOnEnvironment[] | null;
};

// ============================================================================
// Element & Placement Types
// ============================================================================

export type ElementSelectorPropsData = {
  type?: string;
  precision?: string;
  sequence?: string;
  content?: string;
  selectors?: any;
  customSelector?: string;
  isDynamicContent?: boolean;
  screenshot?: string;
  selectorsList?: string[];
  actions?: RulesCondition[];
};

export type ContentModalPlacementData = {
  position: ModalPosition;
  positionOffsetX: number;
  positionOffsetY: number;
};

// ============================================================================
// Other Types
// ============================================================================

export type ContentOmbedInfo = {
  html: string;
  width: number;
  height: number;
};
