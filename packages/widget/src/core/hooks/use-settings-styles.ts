import { convertSettings, mergeThemeDefaultSettings } from '@usertour/helpers';
import { convertToCssVars } from '@usertour/helpers';
import { ThemeTypesSetting } from '@usertour/types';
import { useMemo } from 'react';

import { getAvatarUrlFromSettings } from '../utils/avatar';

interface UseSettingsStylesOptions {
  // CSS vars type: 'tooltip' | 'modal' | etc.
  type?: string;
  // Whether to use local path for avatars (web admin) or CDN (SDK)
  useLocalAvatarPath?: boolean;
}

interface UseSettingsStylesResult {
  globalStyle: string;
  themeSetting: ThemeTypesSetting;
  avatarUrl: string;
}

/**
 * Hook to process theme settings and generate CSS variables and avatar URL
 *
 * @param settings - Raw theme settings
 * @param options - Configuration options for CSS vars type and avatar path
 * @returns Processed theme settings, CSS variables string, and avatar URL
 */
export const useSettingsStyles = (
  settings?: ThemeTypesSetting,
  options: UseSettingsStylesOptions = {},
): UseSettingsStylesResult => {
  const { type = 'tooltip', useLocalAvatarPath = false } = options;

  const themeSetting = useMemo(
    () => mergeThemeDefaultSettings(settings ?? ({} as ThemeTypesSetting)) as ThemeTypesSetting,
    [settings],
  );

  const globalStyle = useMemo(
    () => convertToCssVars(convertSettings(themeSetting), type),
    [themeSetting, type],
  );

  const avatarUrl = useMemo(
    () => getAvatarUrlFromSettings(themeSetting, useLocalAvatarPath),
    [themeSetting, useLocalAvatarPath],
  );

  return { globalStyle, themeSetting, avatarUrl };
};
