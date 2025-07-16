import { LauncherContainer, LauncherRoot, LauncherView } from '@usertour-ui/sdk/src/launcher';
import { DEFAULT_LAUNCHER_DATA, LauncherDataType, ThemeTypesSetting } from '@usertour-ui/types';

interface ThemePreviewLauncherProps {
  type: LauncherDataType;
  settings?: ThemeTypesSetting;
}

export const ThemePreviewLauncher = ({ type, settings }: ThemePreviewLauncherProps) => {
  if (!settings) return null;

  return (
    <div className="h-full w-full scale-100">
      <LauncherRoot data={DEFAULT_LAUNCHER_DATA} themeSettings={settings}>
        <LauncherContainer>
          <LauncherView
            type={type}
            iconType={DEFAULT_LAUNCHER_DATA.iconType}
            style={{
              zIndex: 1,
            }}
          />
        </LauncherContainer>
      </LauncherRoot>
    </div>
  );
};

ThemePreviewLauncher.displayName = 'ThemePreviewLauncher';
