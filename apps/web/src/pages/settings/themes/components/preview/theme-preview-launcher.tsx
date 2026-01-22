import { LauncherContainer, LauncherRoot, LauncherView } from '@usertour-packages/widget';
import {
  LauncherActionType,
  LauncherData,
  LauncherDataType,
  LauncherIconSource,
  LauncherPositionType,
  LauncherTriggerElement,
  LauncherTriggerEvent,
  ThemeTypesSetting,
} from '@usertour/types';

interface ThemePreviewLauncherProps {
  type: LauncherDataType;
  settings?: ThemeTypesSetting;
}

export const previewLauncherData: LauncherData = {
  type: LauncherDataType.ICON,
  iconType: 'information-fill',
  iconSource: LauncherIconSource.BUILTIN,
  buttonText: 'Click me',
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

export const ThemePreviewLauncher = ({ type, settings }: ThemePreviewLauncherProps) => {
  if (!settings) return null;

  return (
    <div className="h-full w-full scale-100">
      <div className="flex flex-row items-center justify-center h-full ">
        <LauncherRoot data={previewLauncherData} themeSettings={settings}>
          <LauncherContainer>
            <LauncherView
              type={type}
              iconType={previewLauncherData.iconType}
              iconSource={previewLauncherData.iconSource}
              buttonText={previewLauncherData.buttonText}
              iconUrl={previewLauncherData.iconUrl}
              style={{
                zIndex: 1,
              }}
            />
          </LauncherContainer>
        </LauncherRoot>
      </div>
    </div>
  );
};

ThemePreviewLauncher.displayName = 'ThemePreviewLauncher';
