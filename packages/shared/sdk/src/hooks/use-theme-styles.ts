import { convertSettings, mergeThemeDefaultSettings } from '@usertour/helpers';
import { convertToCssVars } from '@usertour/helpers';
import { Theme, ThemeTypesSetting } from '@usertour/types';
import { useEffect, useState } from 'react';

export const useThemeStyles = (theme: Theme, type = 'tooltip') => {
  const [themeSetting, setThemeSetting] = useState<ThemeTypesSetting>();
  const [globalStyle, setGlobalStyle] = useState<string>('');

  useEffect(() => {
    if (theme) {
      setThemeSetting(mergeThemeDefaultSettings(theme.settings) as ThemeTypesSetting);
    }
  }, [theme]);

  useEffect(() => {
    if (themeSetting) {
      setGlobalStyle(convertToCssVars(convertSettings(themeSetting), type));
    }
  }, [themeSetting, type]);

  return { globalStyle, themeSetting };
};
