import { useMemo } from 'react';
import { Step, ThemeTypesSetting, StepContentType } from '@usertour/types';

interface UseStepWidthOptions {
  step: Step;
  themeSetting: ThemeTypesSetting | undefined;
}

interface UseStepWidthResult {
  // The actual width to render (step.width ?? themeWidth)
  width: number;
  // The default width from theme for the step type
  defaultWidth: number;
  // Whether using Auto (step.width is undefined)
  isAuto: boolean;
}

/**
 * Get the default width from theme based on step type
 * @param stepType - The type of step (tooltip, modal, bubble, etc.)
 * @param themeSetting - The theme settings
 * @returns The default width for the step type
 */
export function getThemeWidthByStepType(
  stepType: string,
  themeSetting: ThemeTypesSetting | undefined,
): number {
  switch (stepType) {
    case StepContentType.TOOLTIP:
      return themeSetting?.tooltip?.width ?? 300;
    case StepContentType.MODAL:
      return themeSetting?.modal?.width ?? 600;
    case StepContentType.BUBBLE:
      return themeSetting?.bubble?.width ?? 300;
    default:
      return 300;
  }
}

/**
 * Hook to get the step width, falling back to theme default if undefined
 * @param options - The step and theme settings
 * @returns The width, defaultWidth, and isAuto flag
 */
export function useStepWidth(options: UseStepWidthOptions): UseStepWidthResult {
  const { step, themeSetting } = options;

  return useMemo(() => {
    const defaultWidth = getThemeWidthByStepType(step.type, themeSetting);
    const isAuto = step.setting?.width === undefined || step.setting?.width === null;
    // Use nullish coalescing to ensure width is always a number
    const width = step.setting?.width ?? defaultWidth;

    return { width, defaultWidth, isAuto };
  }, [step.type, step.setting?.width, themeSetting]);
}
