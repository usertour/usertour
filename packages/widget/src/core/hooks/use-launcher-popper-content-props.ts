import { useMemo } from 'react';
import { DEFAULT_LAUNCHER_DATA } from '@usertour/constants';
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
  // Auto picks the side for the author, as a flow tooltip's does (above here, flipping below).
  // The side kept from an earlier fixed setting is not followed: the builder does not show it
  // under auto, and left or right has no room beside a wide target.
  const side =
    alignment.alignType === 'auto' ? DEFAULT_LAUNCHER_DATA.tooltip.alignment.side : alignment.side;
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
      side,
      align,
      avoidCollisions: alignment.alignType === 'auto',
      arrowSize,
      arrowColor: themeSetting?.mainColor?.background,
    }),
    [
      tooltipWidth,
      alignment.sideOffset,
      alignment.alignOffset,
      side,
      alignment.alignType,
      align,
      arrowSize,
      themeSetting?.mainColor?.background,
    ],
  );
}
