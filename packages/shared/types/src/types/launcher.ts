import { ElementSelectorPropsData, StepScreenshot } from "./contents";
import { LauncherDataType } from "./contents";
import { RulesCondition } from "./contents";

export type LauncherTooltipSettings = {
  readonly dismissAfterFirstActivation: boolean;
  readonly keepTooltipOpenWhenHovered: boolean;
  readonly hideLauncherWhenTooltipIsDisplayed: boolean;
};

export enum LauncherTriggerElement {
  LAUNCHER = "launcher",
  TARGET = "target",
  TARGET_OR_LAUNCHER = "target-or-launcher",
}

export enum LauncherActionType {
  SHOW_TOOLTIP = "show-tooltip",
  PERFORM_ACTION = "perform-action",
}

export enum LauncherTriggerEvent {
  CLICKED = "clicked",
  HOVERED = "hovered",
}

export type LauncherBehaviorType = {
  triggerElement: LauncherTriggerElement;
  actionType: LauncherActionType;
  triggerEvent: LauncherTriggerEvent;
  actions: RulesCondition[];
};

const SIDE_OPTIONS = ["top", "right", "bottom", "left"] as const;
const ALIGN_OPTIONS = ["start", "center", "end"] as const;
export type Side = (typeof SIDE_OPTIONS)[number];
export type Align = (typeof ALIGN_OPTIONS)[number];
export type AlignType = "auto" | "fixed";

export type ContentAlignmentData = {
  side: Side;
  align: Align;
  alignType: AlignType;
  sideOffset: number;
  alignOffset: number;
};

export enum LauncherPositionType {
  TARGET = "target",
  LAUNCHER = "launcher",
}

export type LauncherData = {
  type: LauncherDataType;
  iconType: string;
  zIndex?: number;
  target: {
    element: ElementSelectorPropsData | undefined;
    screenshot: StepScreenshot | undefined;
    alignment: ContentAlignmentData;
  };
  behavior: LauncherBehaviorType;
  tooltip: {
    reference: LauncherPositionType;
    element: ElementSelectorPropsData | undefined;
    alignment: ContentAlignmentData;
    width: number;
    settings: LauncherTooltipSettings;
    content: any;
  };
};

export const DEFAULT_LAUNCHER_DATA: LauncherData = {
  type: LauncherDataType.ICON,
  iconType: "user",
  target: {
    element: undefined,
    screenshot: undefined,
    alignment: {
      side: "top",
      align: "center",
      alignType: "auto",
      sideOffset: 0,
      alignOffset: 0,
    },
  },
  tooltip: {
    reference: LauncherPositionType.TARGET,
    element: undefined,
    alignment: {
      side: "top",
      align: "center",
      alignType: "auto",
      sideOffset: 0,
      alignOffset: 0,
    },
    content: [],
    width: 250,
    settings: {
      dismissAfterFirstActivation: false,
      keepTooltipOpenWhenHovered: false,
      hideLauncherWhenTooltipIsDisplayed: false,
    },
  },
  behavior: {
    triggerElement: LauncherTriggerElement.LAUNCHER,
    actionType: LauncherActionType.SHOW_TOOLTIP,
    triggerEvent: LauncherTriggerEvent.CLICKED,
    actions: [],
  },
};
