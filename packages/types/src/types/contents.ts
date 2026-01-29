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
  FLOW_START = 'flow-start',
  PAGE_NAVIGATE = 'page-navigate',
  JAVASCRIPT_EVALUATE = 'javascript-evaluate',
}

export enum ContentDataType {
  CHECKLIST = 'checklist',
  FLOW = 'flow',
  LAUNCHER = 'launcher',
  BANNER = 'banner',
  NPS = 'nps',
  SURVEY = 'survey',
  TRACKER = 'tracker',
  EVENT = 'event',
}

export enum ContentTypeName {
  CHECKLISTS = 'checklists',
  FLOWS = 'flows',
  LAUNCHERS = 'launchers',
  // RESOURCE_CENTERS = "resource-centers",
  BANNERS = 'banners',
  NPS = 'nps',
  SURVEYS = 'surveys',
  TRACKERS = 'trackers',
  EVENTS = 'events',
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
  LeftBottom = 'leftBottom',
  CenterBottom = 'centerBottom',
  RightBottom = 'rightBottom',
  Center = 'center',
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
  themeId?: string;
  target?: ElementSelectorPropsData;
  screenshot?: StepScreenshot;
  createdAt?: string;
  updatedAt?: string;
  trigger?: StepTrigger[];
  sequence: number;
  setting: StepSettings;
  data?: any;
};

// ============================================================================
// Content Types
// ============================================================================

export type ContentConfig = {
  name?: string;
  enabledAutoStartRules?: boolean;
  enabledHideRules?: boolean;
  autoStartRules?: string;
  hideRules?: string;
};

export type ContentVersion = {
  id: string;
  createdAt: string;
  updatedAt: string;
  contentId: string;
  themeId: string;
  config: ContentConfigObject;
  data: any;
  sequence: number;
  type: string;
  steps?: Step[];
};

export type ContentOnEnvironment = {
  environment: {
    id: string;
    name: string;
  };
  environmentId: string;
  contentId: string;
  published: boolean;
  publishedAt: Date;
  publishedVersionId: string;
  publishedVersion: ContentVersion;
};

export type Content = {
  id: string;
  name?: string;
  type: ContentDataType;
  config?: {
    rollWindowConfig?: {
      nps: number;
      rate: number;
      scale: number;
    };
  };
  publishedVersion?: ContentVersion;
  buildUrl?: string;
  published?: boolean;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  environmentId?: string;
  editedVersionId?: string;
  publishedVersionId?: string;
  deleted?: boolean;
  steps?: Step[];
  contentOnEnvironments?: ContentOnEnvironment[];
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
