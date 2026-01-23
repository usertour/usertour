// Serialize module exports
// Only export what's actually needed by external consumers

// Main serialize component
export { ContentEditorSerialize } from './content-editor-serialize';

// Style transformation utilities - shared with editor package
export {
  transformMarginStyle,
  transformPaddingStyle,
  createDefaultMarginConfig,
  createDefaultPaddingConfig,
} from './utils';

// Constants - shared with editor package
export { PADDING_KEY_MAPPING, PADDING_POSITIONS } from './constants';

// Types - shared with editor package
export type { PaddingStyleProps } from './types';
