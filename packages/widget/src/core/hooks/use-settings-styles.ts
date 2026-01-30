import { convertSettings, mergeThemeDefaultSettings } from '@usertour/helpers';
import { convertToCssVars } from '@usertour/helpers';
import { getAvatar, type AvatarComponent } from '@usertour-packages/icons';
import { AvatarType, ThemeTypesSetting } from '@usertour/types';
import { useMemo } from 'react';

import { getAvatarUrlFromSettings } from '../utils/avatar';

interface UseSettingsStylesOptions {
  // CSS vars type: 'tooltip' | 'modal' | etc.
  type?: string;
}

interface UseSettingsStylesResult {
  globalStyle: string;
  themeSetting: ThemeTypesSetting;
  avatarUrl: string;
  avatarComponent: AvatarComponent | null;
}

/**
 * Hook to process theme settings and generate CSS variables and avatar URL
 *
 * @param settings - Raw theme settings
 * @param options - Configuration options for CSS vars type
 * @returns Processed theme settings, CSS variables string, avatar URL, and avatar component
 */
export const useSettingsStyles = (
  settings?: ThemeTypesSetting,
  options: UseSettingsStylesOptions = {},
): UseSettingsStylesResult => {
  const { type = 'tooltip' } = options;

  const themeSetting = useMemo(
    () => mergeThemeDefaultSettings(settings ?? ({} as ThemeTypesSetting)) as ThemeTypesSetting,
    [settings],
  );

  const globalStyle = useMemo(
    () => convertToCssVars(convertSettings(themeSetting), type),
    [themeSetting, type],
  );

  const avatarUrl = useMemo(() => getAvatarUrlFromSettings(themeSetting), [themeSetting]);

  const avatarComponent = useMemo(() => {
    const avatar = themeSetting?.avatar;
    if (avatar?.type === AvatarType.CARTOON && avatar?.name) {
      return getAvatar(avatar.name) ?? null;
    }
    return null;
  }, [themeSetting]);

  return { globalStyle, themeSetting, avatarUrl, avatarComponent };
};
