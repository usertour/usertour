import { convertSettings, mergeThemeDefaultSettings } from '@usertour-packages/utils';
import { convertToCssVars } from '@usertour-packages/utils';
import { ThemeTypesSetting } from '@usertour/types';

export const useSettingsStyles = (settings: ThemeTypesSetting) => {
  const themeSetting = mergeThemeDefaultSettings(settings);
  const globalStyle = convertToCssVars(convertSettings(themeSetting));

  return { globalStyle, themeSetting };
};
