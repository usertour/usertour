// Width-related types shared across content editor components

import type { WIDTH_TYPES } from '../constants/width';

export type WidthType = (typeof WIDTH_TYPES)[keyof typeof WIDTH_TYPES];

// Dimension type for image (percent or pixels only)
export type DimensionType = 'percent' | 'pixels';

export interface WidthConfig {
  type?: string;
  value?: number;
}

export interface DimensionConfig {
  type: DimensionType;
  value?: number;
}
