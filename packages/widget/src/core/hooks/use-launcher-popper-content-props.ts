import { useMemo } from 'react';
import type { LauncherData, ThemeTypesSetting } from '@usertour/types';
import { StepContentType } from '@usertour/types';
import type { PopperContentProps } from '../popper';
import { getThemeWidthByStepType } from './use-step-width';

const DEFAULT_NOTCH_SIZE = 20;

export type LauncherPopperContentProps = Pick<
  PopperContentProps,
  | 'width'
  | 'sideOffset'
  | 'alignOffset'
  | 'side'
  | 'align'
  | 'avoidCollisions'
  | 'arrowSize'
  | 'arrowColor'
>;

interface UseLauncherPopperContentPropsOptions {
  themeSetting: ThemeTypesSetting | undefined;
  data: LauncherData;
}

/**
 * Derives PopperContentPotal props from launcher context (theme + data).
 * Keeps LauncherPopperContentPotal thin and logic testable.
 */
export function useLauncherPopperContentProps(
  options: UseLauncherPopperContentPropsOptions,
): LauncherPopperContentProps {
  const { themeSetting, data } = options;

  const tooltipWidth =
    data.tooltip.width ?? getThemeWidthByStepType(StepContentType.TOOLTIP, themeSetting);
  const { alignment } = data.tooltip;
  const align = alignment.alignType === 'auto' ? 'center' : (alignment.align ?? 'center');
  const notchSize = themeSetting?.tooltip?.notchSize ?? DEFAULT_NOTCH_SIZE;

  const arrowSize = useMemo(
    () => ({
      width: notchSize,
      height: notchSize / 2,
    }),
    [notchSize],
  );

  return useMemo(
    () => ({
      width: `${tooltipWidth}px`,
      sideOffset: alignment.sideOffset,
      alignOffset: alignment.alignOffset,
      side: alignment.side,
      align,
      avoidCollisions: alignment.alignType === 'auto',
      arrowSize,
      arrowColor: themeSetting?.mainColor?.background,
    }),
    [
      tooltipWidth,
      alignment.sideOffset,
      alignment.alignOffset,
      alignment.side,
      alignment.alignType,
      align,
      arrowSize,
      themeSetting?.mainColor?.background,
    ],
  );
}
