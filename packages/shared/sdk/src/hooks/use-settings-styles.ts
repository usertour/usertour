import { convertSettings, mergeThemeDefaultSettings } from '@usertour/helpers';
import { convertToCssVars } from '@usertour/helpers';
import { ThemeTypesSetting } from '@usertour/types';

export const useSettingsStyles = (settings: ThemeTypesSetting) => {
  const themeSetting = mergeThemeDefaultSettings(settings);
  const globalStyle = convertToCssVars(convertSettings(themeSetting));

  return { globalStyle, themeSetting };
};
