// Dimension-related utility functions for serialize components

import { toNumericValue } from '@usertour/helpers';

import { DEFAULT_DIMENSION_TYPE, DEFAULT_WIDTH_TYPE, WIDTH_TYPES } from '../constants';
import type { DimensionConfig, DimensionType, WidthConfig, WidthType } from '../types';

/**
 * Ensures dimension config has proper defaults for image elements (percent/pixels only)
 */
export const ensureDimensionWithDefaults = (dimension?: WidthConfig): DimensionConfig => ({
  type: (dimension?.type as DimensionType) || DEFAULT_DIMENSION_TYPE,
  value: toNumericValue(dimension?.value as number | string | undefined),
});

/**
 * Ensures width config has proper defaults for column elements (percent/pixels/fill)
 */
export const ensureWidthWithDefaults = (
  width?: WidthConfig,
): { type: WidthType; value?: number } => ({
  type: (width?.type as WidthType) || DEFAULT_WIDTH_TYPE,
  value: toNumericValue(width?.value as number | string | undefined),
});

/**
 * Converts width config to CSS width string
 */
export const getWidthStyle = (
  width: { type: string; value?: number },
  defaultWidth?: number,
): string | undefined => {
  const numericValue = toNumericValue(width.value);
  if (numericValue !== undefined) {
    return width.type === WIDTH_TYPES.PERCENT ? `${numericValue}%` : `${numericValue}px`;
  }
  const numericDefaultWidth = toNumericValue(defaultWidth);
  if (width.type === WIDTH_TYPES.PERCENT && numericDefaultWidth !== undefined) {
    return `${numericDefaultWidth}%`;
  }
  return undefined;
};
