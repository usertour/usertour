// Embed-related constants shared across content editor components

import type { CompactSelectOption } from '@usertour/ui';

import { WIDTH_TYPES } from './width';

export const DEFAULT_EMBED_SIZE = 200;
export const DEFAULT_EMBED_WIDTH = 100;
export const DEFAULT_EMBED_HEIGHT = 100;

// Width/Height type options for embed component (percent and pixels only)
export const EMBED_DIMENSION_TYPE_OPTIONS: CompactSelectOption[] = [
  { value: WIDTH_TYPES.PERCENT, label: '%' },
  { value: WIDTH_TYPES.PIXELS, label: 'pixels' },
];
