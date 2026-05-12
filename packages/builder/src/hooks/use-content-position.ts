import { mergeThemeDefaultSettings } from '@usertour/helpers';
import {
  ContentDataType,
  ModalPosition,
  StepContentType,
  ThemeTypesSetting,
} from '@usertour/types';
import { useMemo } from 'react';
import { useBuilderContext } from '../contexts';
import { useCurrentTheme } from './use-current-theme';

/**
 * Hook to get the content position based on current content/step type
 * - Checklist: uses theme.settings.checklist.placement.position
 * - Modal: uses step.setting.position
 * - Bubble: uses theme.settings.bubble.placement.position
 * - Tooltip: no fixed position (returns undefined)
 * @returns The content position or undefined
 */
export function useContentPosition(): ModalPosition | string | undefined {
  const { currentStep, currentContent } = useBuilderContext();
  // Need to fallback to default theme to get placement position
  const theme = useCurrentTheme({ fallbackToDefault: true });

  // Merge theme settings with defaults to ensure placement exists
  const themeSetting = useMemo(
    () => mergeThemeDefaultSettings(theme?.settings ?? ({} as ThemeTypesSetting)),
    [theme?.settings],
  );

  return useMemo(() => {
    // Handle Checklist content type
    if (currentContent?.type === ContentDataType.CHECKLIST) {
      return themeSetting?.checklist?.placement?.position;
    }

    // Handle Flow step types
    if (!currentStep) return undefined;

    if (currentStep.type === StepContentType.MODAL) {
      return currentStep.setting?.position;
    }
    if (currentStep.type === StepContentType.BUBBLE) {
      return themeSetting?.bubble?.placement?.position;
    }
    // Tooltip doesn't have a fixed screen position
    return undefined;
  }, [currentContent?.type, currentStep, themeSetting]);
}
