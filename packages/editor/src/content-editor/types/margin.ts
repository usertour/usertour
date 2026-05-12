// Margin-related types shared across content editor components

import type { MARGIN_KEY_MAPPING } from '../constants/margin';

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
