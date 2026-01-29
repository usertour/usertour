// CSS class constants shared across content editor components

// Column selection state classes
export const ACTIVE_CLASSES = 'outline-1 outline-primary outline';
export const HOVER_CLASSES = 'outline-1 outline-primary outline-dashed';

// Column layout options
export const JUSTIFY_CONTENT_OPTIONS = {
  START: 'justify-start',
  CENTER: 'justify-center',
  END: 'justify-end',
  BETWEEN: 'justify-between',
  EVENLY: 'justify-evenly',
  AROUND: 'justify-around',
} as const;

export const ALIGN_ITEMS_OPTIONS = {
  START: 'items-start',
  CENTER: 'items-center',
  END: 'items-end',
  BASELINE: 'items-baseline',
} as const;

export const DEFAULT_JUSTIFY_CONTENT = JUSTIFY_CONTENT_OPTIONS.START;
export const DEFAULT_ALIGN_ITEMS = ALIGN_ITEMS_OPTIONS.START;

// Button style options
export const BUTTON_STYLES = {
  DEFAULT: 'default',
  SECONDARY: 'secondary',
} as const;

// Image size defaults
export const DEFAULT_IMAGE_SIZE = 160; // 40 * 4 (w-40 h-40)
export const DEFAULT_SPINNER_SIZE = 40; // h-10 w-10
