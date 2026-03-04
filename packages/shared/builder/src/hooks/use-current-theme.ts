import { useThemeListContext } from '@usertour-packages/contexts';
import { Theme } from '@usertour/types';
import { mergeThemeDefaultSettings } from '@usertour/helpers';
import { useMemo } from 'react';
import { useBuilderContext } from '../contexts';

interface UseCurrentThemeOptions {
  /** Whether to fall back to the default theme if no themeId is found */
  fallbackToDefault?: boolean;
}

/**
 * Hook to get the current theme based on step/version themeId
 * @param options - Configuration options
 * @returns The current theme or undefined
 */
export function useCurrentTheme(options: UseCurrentThemeOptions = {}): Theme | undefined {
  const { fallbackToDefault = false } = options;
  const { currentStep, currentVersion } = useBuilderContext();
  const { themeList } = useThemeListContext();

  return useMemo(() => {
    if (!themeList || themeList.length === 0) return undefined;

    // Priority: currentStep.themeId > currentVersion.themeId > default (if enabled)
    let theme: Theme | undefined;
    if (currentStep?.themeId) {
      theme = themeList.find((item) => item.id === currentStep.themeId);
    } else if (currentVersion?.themeId) {
      theme = themeList.find((item) => item.id === currentVersion.themeId);
    } else if (fallbackToDefault) {
      theme = themeList.find((item) => item.isDefault);
    }

    // If theme is found, merge its settings with defaultSettings to ensure completeness
    if (theme) {
      return {
        ...theme,
        settings: mergeThemeDefaultSettings(theme.settings),
      };
    }

    return undefined;
  }, [themeList, currentStep?.themeId, currentVersion?.themeId, fallbackToDefault]);
}
