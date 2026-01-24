// Style transformation utilities for serialize components

import { toNumericValue } from '@usertour/helpers';
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
    const numericValue = toNumericValue(marginValue as number | string | undefined);
    if (numericValue !== undefined) {
      style[marginName as keyof MarginStyleProps] = margin.enabled
        ? `${numericValue}px`
        : undefined;
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
    // TypeScript infers the value might include 'enabled' (boolean), so we need to assert
    const paddingValue = padding[position] as number | string | undefined;
    const numericValue = toNumericValue(paddingValue);
    if (numericValue !== undefined) {
      style[paddingName as keyof PaddingStyleProps] = padding.enabled
        ? `${numericValue}px`
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
