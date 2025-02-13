import { convertSettings, mergeThemeDefaultSettings } from '@usertour-ui/shared-utils';
import { convertToCssVars } from '@usertour-ui/shared-utils';
import { Theme, ThemeTypesSetting } from '@usertour-ui/types';
import { useEffect, useState } from 'react';

export const useThemeStyles = (theme: Theme) => {
  const [themeSetting, setThemeSetting] = useState<ThemeTypesSetting>();
  const [globalStyle, setGlobalStyle] = useState<string>('');

  useEffect(() => {
    if (theme) {
      setThemeSetting(mergeThemeDefaultSettings(theme.settings));
    }
  }, [theme]);

  useEffect(() => {
    if (themeSetting) {
      setGlobalStyle(convertToCssVars(convertSettings(themeSetting)));
    }
  }, [themeSetting]);

  return { globalStyle, themeSetting };
};
