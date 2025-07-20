import { convertSettings, mergeThemeDefaultSettings } from '@usertour-ui/shared-utils';
import { convertToCssVars } from '@usertour-ui/shared-utils';
import { ThemeTypesSetting } from '@usertour-ui/types';

export const useSettingsStyles = (settings: ThemeTypesSetting) => {
  const themeSetting = mergeThemeDefaultSettings(settings);
  const globalStyle = convertToCssVars(convertSettings(themeSetting));

  return { globalStyle, themeSetting };
};
