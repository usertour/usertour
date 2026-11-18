import { useThemeList } from '@/hooks/use-theme-list';
import type { Theme } from '@usertour/data';
import type { Step } from '@usertour/types';
import { mergeThemeDefaultSettings } from '@usertour/helpers';
import { useMemo } from 'react';
import { useBuilderStore } from '@/pages/contents/components/builder/core';

interface UseCurrentThemeOptions {
  /** Whether to fall back to the default theme if no themeId is found */
  fallbackToDefault?: boolean;
  /**
   * The step whose theme to use instead of the store's current step — for a
   * view that shows a step other than the one being edited. When given and
   * undefined, no step theme applies.
   */
  step?: Pick<Step, 'themeId'>;
}

/**
 * Hook to get the current theme based on step/version themeId
 * @param options - Configuration options
 * @returns The current theme or undefined
 */
export function useCurrentTheme(options: UseCurrentThemeOptions = {}): Theme | undefined {
  const { fallbackToDefault = false } = options;
  const storeStep = useBuilderStore((state) => state.currentStep);
  const stepThemeId = 'step' in options ? options.step?.themeId : storeStep?.themeId;
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const { themeList } = useThemeList();

  return useMemo(() => {
    if (!themeList || themeList.length === 0) return undefined;

    // Priority: currentStep.themeId > currentVersion.themeId > default (if enabled)
    let theme: Theme | undefined;
    if (stepThemeId) {
      theme = themeList.find((item) => item.id === stepThemeId);
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
  }, [themeList, stepThemeId, currentVersion?.themeId, fallbackToDefault]);
}
