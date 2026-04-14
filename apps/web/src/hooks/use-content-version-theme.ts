import { useContentVersionContext } from '@/contexts/content-version-context';
import { useThemeListContext } from '@/contexts/theme-list-context';
import { useMutation } from '@apollo/client';
import { updateContentVersion } from '@usertour-packages/gql';
import { convertSettings, convertToCssVars, mergeThemeDefaultSettings } from '@usertour/helpers';
import type { Theme, ThemeTypesSetting } from '@usertour/types';
import { useEffect, useMemo } from 'react';

interface UseContentVersionThemeOptions {
  /** CSS vars type passed to convertToCssVars (default: 'tooltip'). */
  cssVarsType?: string;
}

interface UseContentVersionThemeResult {
  /** The resolved theme (from version.themeId or the default theme). */
  currentTheme: Theme | undefined;
  /** CSS variable string generated from the theme settings. */
  globalStyle: string;
}

/**
 * Resolves the theme for the current content version.
 *
 * - If `version.themeId` is set, looks it up in the theme list.
 * - If `version.themeId` is empty, automatically persists the default theme
 *   to the version and refetches so the UI stays in sync.
 * - Generates a CSS variable string from the resolved theme settings.
 */
export const useContentVersionTheme = (
  options: UseContentVersionThemeOptions = {},
): UseContentVersionThemeResult => {
  const { cssVarsType = 'tooltip' } = options;
  const { version, refetch: refetchVersion } = useContentVersionContext();
  const { themeList } = useThemeListContext();
  const [updateVersionMutation] = useMutation(updateContentVersion);

  // Auto-set default theme if version has no themeId
  useEffect(() => {
    if (version && !version.themeId && themeList?.length) {
      const defaultTheme = themeList.find((t) => t.isDefault);
      if (defaultTheme) {
        updateVersionMutation({
          variables: {
            versionId: version.id,
            content: { themeId: defaultTheme.id },
          },
        }).then(() => {
          refetchVersion();
        });
      }
    }
  }, [version?.id, version?.themeId, themeList]);

  const currentTheme = useMemo(() => {
    if (!themeList?.length || !version) return undefined;
    if (version.themeId) {
      return themeList.find((t) => t.id === version.themeId);
    }
    return themeList.find((t) => t.isDefault);
  }, [themeList, version?.themeId]);

  const globalStyle = useMemo(() => {
    if (!currentTheme) return '';
    const merged = mergeThemeDefaultSettings(currentTheme.settings) as ThemeTypesSetting;
    return convertToCssVars(convertSettings(merged), cssVarsType);
  }, [currentTheme, cssVarsType]);

  return { currentTheme, globalStyle };
};
