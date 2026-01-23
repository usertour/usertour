// Style transformation utilities for serialize components

import type { ContentEditorPadding } from '@usertour/types';

import {
  MARGIN_KEY_MAPPING,
  MARGIN_POSITIONS,
  PADDING_KEY_MAPPING,
  PADDING_POSITIONS,
} from '../constants';
import type { MarginConfig, MarginStyleProps, PaddingStyleProps } from '../types';

/**
 * Transforms margin config to CSS style properties
 */
export const transformMarginStyle = (margin?: MarginConfig): MarginStyleProps => {
  const style: MarginStyleProps = {};

  if (!margin) {
    return style;
  }

  for (const position of MARGIN_POSITIONS) {
    const marginName = MARGIN_KEY_MAPPING[position];
    const marginValue = margin[position as keyof MarginConfig];
    if (marginValue !== undefined && typeof marginValue === 'number') {
      style[marginName as keyof MarginStyleProps] = margin.enabled ? `${marginValue}px` : undefined;
    }
  }

  return style;
};

/**
 * Creates default margin config
 */
export const createDefaultMarginConfig = (enabled = false): MarginConfig => ({
  enabled,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
});

/**
 * Transforms padding config to CSS style properties
 */
export const transformPaddingStyle = (padding?: ContentEditorPadding): PaddingStyleProps => {
  const style: PaddingStyleProps = {};

  if (!padding) {
    return style;
  }

  for (const position of PADDING_POSITIONS) {
    const paddingName = PADDING_KEY_MAPPING[position];
    const paddingValue = padding[position as keyof ContentEditorPadding];
    if (paddingValue !== undefined && typeof paddingValue === 'number') {
      style[paddingName as keyof PaddingStyleProps] = padding.enabled
        ? `${paddingValue}px`
        : undefined;
    }
  }

  return style;
};

/**
 * Creates default padding config
 */
export const createDefaultPaddingConfig = (enabled = false): ContentEditorPadding => ({
  enabled,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
});
