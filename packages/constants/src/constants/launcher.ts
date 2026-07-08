import {
  LauncherActionType,
  LauncherDataType,
  LauncherIconSource,
  LauncherPositionType,
  LauncherTriggerElement,
  LauncherTriggerEvent,
} from '@usertour/types';
import type { LauncherData } from '@usertour/types';

export const DEFAULT_LAUNCHER_DATA: LauncherData = {
  type: LauncherDataType.ICON,
  iconType: 'user',
  iconSource: LauncherIconSource.BUILTIN,
  target: {
    element: undefined,
    screenshot: undefined,
    alignment: {
      side: 'top',
      align: 'center',
      alignType: 'auto',
      sideOffset: 0,
      alignOffset: 0,
    },
  },
  tooltip: {
    reference: LauncherPositionType.TARGET,
    element: undefined,
    alignment: {
      side: 'top',
      align: 'center',
      alignType: 'auto',
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
