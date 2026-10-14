// Width-related constants shared across content editor components

import type { CompactSelectOption } from '@usertour/ui';

export const WIDTH_TYPES = {
  PERCENT: 'percent',
  PIXELS: 'pixels',
  FILL: 'fill',
} as const;

// Width type options for image component (without fill)
export const IMAGE_WIDTH_TYPE_OPTIONS: CompactSelectOption[] = [
  { value: WIDTH_TYPES.PERCENT, label: '%' },
  { value: WIDTH_TYPES.PIXELS, label: 'pixels' },
];

// Width type options for column component (with fill)
export const COLUMN_WIDTH_TYPE_OPTIONS: CompactSelectOption[] = [
  { value: WIDTH_TYPES.PERCENT, label: '%' },
  { value: WIDTH_TYPES.PIXELS, label: 'pixels' },
  { value: WIDTH_TYPES.FILL, label: 'fill' },
];

export const DEFAULT_WIDTH = 100;
export const DEFAULT_DIMENSION_TYPE = 'percent' as const;
export const DEFAULT_WIDTH_TYPE = WIDTH_TYPES.PERCENT;
