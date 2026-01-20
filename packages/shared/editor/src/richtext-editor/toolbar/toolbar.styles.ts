import { cn } from '@usertour-packages/tailwind';

// Base button styles for all toolbar buttons
// Button size: icon 16px + padding 4px*2 = 24px (square)
export const TOOLBAR_BUTTON_BASE = cn(
  'flex-shrink-0 flex-grow-0 basis-auto',
  'p-1 rounded',
  'inline-flex items-center justify-center',
  'text-xs leading-none text-foreground',
  'outline-none',
  'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
);

// Active state styles (applied via isActive prop, not data-state)
export const TOOLBAR_BUTTON_ACTIVE = 'bg-primary/15 text-primary';

// Inactive state styles
export const TOOLBAR_BUTTON_INACTIVE = 'opacity-50 hover:bg-primary/15';

// Toggle group styles - gap for button spacing
export const TOOLBAR_TOGGLE_GROUP = 'flex gap-0.5';

// Toolbar container styles
export const TOOLBAR_CONTAINER = cn(
  'fixed -top-8 left-0 flex flex-row items-center',
  'p-2 w-full min-w-max',
  'rounded-t-lg bg-editor-toolbar',
);

// Overflow popover content styles
export const TOOLBAR_OVERFLOW_CONTENT = cn(
  'flex flex-row items-center p-1.5 w-full min-w-max rounded-lg',
  'bg-editor-toolbar',
);

// Separator styles (height matches button size)
export const TOOLBAR_SEPARATOR = 'w-px h-4 bg-primary/30 mx-2.5';

// Responsive layout constants
export const RESPONSIVE = {
  BREAKPOINT: 360,
  CONTAINER_PADDING: 10,
  ITEM_WIDTH: 26, // 24px button + 2px gap
} as const;

// Icon sizes (use even numbers for pixel-perfect rendering)
export const ICON_SIZE = {
  DEFAULT: 16,
} as const;
