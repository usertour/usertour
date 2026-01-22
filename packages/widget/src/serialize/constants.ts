// Constants for serialize components

// Re-export margin constants from media
export { MARGIN_KEY_MAPPING, MARGIN_POSITIONS } from '../media/constants';

// Width constants
export const WIDTH_TYPES = {
  PERCENT: 'percent',
  PIXELS: 'pixels',
  FILL: 'fill',
} as const;

export const DEFAULT_WIDTH = 100;
export const DEFAULT_DIMENSION_TYPE = 'percent' as const;
export const DEFAULT_WIDTH_TYPE = WIDTH_TYPES.PERCENT;

// Column defaults
export const DEFAULT_JUSTIFY_CONTENT = 'justify-start';
export const DEFAULT_ALIGN_ITEMS = 'items-start';

// Richtext alignment mapping
export const ALIGN_MAPPING: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
};
