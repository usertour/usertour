import { useThemeListContext } from '@usertour-packages/contexts';
import { Theme } from '@usertour/types';
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
    if (currentStep?.themeId) {
      return themeList.find((item) => item.id === currentStep.themeId);
    }
    if (currentVersion?.themeId) {
      return themeList.find((item) => item.id === currentVersion.themeId);
    }
    if (fallbackToDefault) {
      return themeList.find((item) => item.isDefault);
    }
    return undefined;
  }, [themeList, currentStep?.themeId, currentVersion?.themeId, fallbackToDefault]);
}
