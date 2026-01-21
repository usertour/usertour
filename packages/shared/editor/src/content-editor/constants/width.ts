// Width-related constants shared across content editor components

import type { ComboBoxOption } from '@usertour-packages/combo-box';

export const WIDTH_TYPES = {
  PERCENT: 'percent',
  PIXELS: 'pixels',
  FILL: 'fill',
} as const;

// Width type options for image component (without fill)
export const IMAGE_WIDTH_TYPE_OPTIONS: ComboBoxOption[] = [
  { value: WIDTH_TYPES.PERCENT, name: '%' },
  { value: WIDTH_TYPES.PIXELS, name: 'pixels' },
];

// Width type options for column component (with fill)
export const COLUMN_WIDTH_TYPE_OPTIONS: ComboBoxOption[] = [
  { value: WIDTH_TYPES.PERCENT, name: '%' },
  { value: WIDTH_TYPES.PIXELS, name: 'pixels' },
  { value: WIDTH_TYPES.FILL, name: 'fill' },
];

export const DEFAULT_WIDTH = 100;
export const DEFAULT_DIMENSION_TYPE = 'percent' as const;
export const DEFAULT_WIDTH_TYPE = WIDTH_TYPES.PERCENT;
