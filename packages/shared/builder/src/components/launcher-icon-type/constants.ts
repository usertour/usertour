// Tab values
export const TAB_VALUES = {
  BUILTIN: 'builtin',
  UPLOAD: 'upload',
  URL: 'url',
} as const;

export type TabValue = (typeof TAB_VALUES)[keyof typeof TAB_VALUES];

// Accepted file types for upload
export const ACCEPT_FILE_TYPES = 'image/svg+xml,image/*';
