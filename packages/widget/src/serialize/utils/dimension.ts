// Dimension-related utility functions for serialize components

import { DEFAULT_DIMENSION_TYPE, DEFAULT_WIDTH_TYPE, WIDTH_TYPES } from '../constants';
import type { DimensionConfig, DimensionType, WidthConfig, WidthType } from '../types';

/**
 * Ensures dimension config has proper defaults for image elements (percent/pixels only)
 */
export const ensureDimensionWithDefaults = (dimension?: WidthConfig): DimensionConfig => ({
  type: (dimension?.type as DimensionType) || DEFAULT_DIMENSION_TYPE,
  value: dimension?.value,
});

/**
 * Ensures width config has proper defaults for column elements (percent/pixels/fill)
 */
export const ensureWidthWithDefaults = (
  width?: WidthConfig,
): { type: WidthType; value?: number } => ({
  type: (width?.type as WidthType) || DEFAULT_WIDTH_TYPE,
  value: width?.value,
});

/**
 * Converts width config to CSS width string
 */
export const getWidthStyle = (
  width: { type: string; value?: number },
  defaultWidth?: number,
): string | undefined => {
  if (width.value) {
    return width.type === WIDTH_TYPES.PERCENT ? `${width.value}%` : `${width.value}px`;
  }
  if (width.type === WIDTH_TYPES.PERCENT && defaultWidth) {
    return `${defaultWidth}%`;
  }
  return undefined;
};
