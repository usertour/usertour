// Media components for SDK widget

// Types
export type {
  DimensionType,
  Dimension,
  MarginPosition,
  Margin,
  OEmbedData,
  EmbedData,
} from './types';

// Constants
export {
  DEFAULT_EMBED_SIZE,
  DEFAULT_EMBED_WIDTH,
  DEFAULT_EMBED_HEIGHT,
  MARGIN_KEY_MAPPING,
  MARGIN_POSITIONS,
} from './constants';

// Embed
export {
  Embed,
  // Backward compatibility
  EmbedContent,
  type EmbedProps,
  type EmbedContentProps,
} from './embed';
