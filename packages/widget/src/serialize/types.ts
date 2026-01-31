// Type definitions for serialize components

import type { MARGIN_KEY_MAPPING } from '../media/constants';

// Width types
export const WIDTH_TYPES = {
  PERCENT: 'percent',
  PIXELS: 'pixels',
  FILL: 'fill',
} as const;

export type WidthType = (typeof WIDTH_TYPES)[keyof typeof WIDTH_TYPES];

// Dimension type for image (percent or pixels only)
export type DimensionType = 'percent' | 'pixels';

export interface WidthConfig {
  type?: string;
  value?: number;
}

export interface DimensionConfig {
  type: DimensionType;
  value?: number;
}

// Margin types (reuse from media)
export type MarginPosition = keyof typeof MARGIN_KEY_MAPPING;

export interface MarginConfig {
  enabled?: boolean;
  left?: number;
  top?: number;
  bottom?: number;
  right?: number;
}

export interface MarginStyleProps {
  marginLeft?: string;
  marginTop?: string;
  marginBottom?: string;
  marginRight?: string;
}

// Padding style props
export interface PaddingStyleProps {
  paddingLeft?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingRight?: string;
}

// Column style types
export interface ColumnStyle extends PaddingStyleProps {
  marginBottom: string;
  marginRight?: string;
  width?: string;
  flex?: string;
  minWidth: string;
}

// Richtext element types (replace slate types)
export interface TextNode {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
}

export interface ElementNode {
  type?: string;
  children?: DescendantNode[];
  align?: string;
  // Link element properties
  url?: string;
  openType?: string;
  // User attribute properties
  attrCode?: string;
  fallback?: string;
  value?: string;
}

export type DescendantNode = TextNode | ElementNode;

// Type guard for text nodes (replaces slate Text.isText)
export const isTextNode = (node: unknown): node is TextNode => {
  return typeof node === 'object' && node !== null && 'text' in node;
};
