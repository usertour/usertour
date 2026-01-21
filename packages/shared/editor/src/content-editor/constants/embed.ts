// Embed-related constants shared across content editor components

import type { ComboBoxOption } from '@usertour-packages/combo-box';

import { WIDTH_TYPES } from './width';

export const DEFAULT_EMBED_SIZE = 200;
export const DEFAULT_EMBED_WIDTH = 100;
export const DEFAULT_EMBED_HEIGHT = 100;

// Width/Height type options for embed component (percent and pixels only)
export const EMBED_DIMENSION_TYPE_OPTIONS: ComboBoxOption[] = [
  { value: WIDTH_TYPES.PERCENT, name: '%' },
  { value: WIDTH_TYPES.PIXELS, name: 'pixels' },
];
