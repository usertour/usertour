// Type definitions for media components

/**
 * Dimension type for width/height
 */
export type DimensionType = 'percent' | 'pixels';

/**
 * Dimension configuration
 */
export interface Dimension {
  type?: DimensionType;
  value?: number;
}

/**
 * Margin position type
 */
export type MarginPosition = 'left' | 'top' | 'bottom' | 'right';

/**
 * Margin configuration
 */
export interface Margin {
  enabled?: boolean;
  left?: number;
  top?: number;
  bottom?: number;
  right?: number;
}

/**
 * OEmbed data from external providers
 */
export interface OEmbedData {
  html?: string;
  width?: number;
  height?: number;
  title?: string;
  provider_name?: string;
  thumbnail_url?: string;
}

/**
 * Embed element data structure
 */
export interface EmbedData {
  url?: string;
  parsedUrl?: string;
  width?: Dimension;
  height?: Dimension;
  margin?: Margin;
  oembed?: OEmbedData;
}
