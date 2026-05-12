// Style transformation utilities

import { toNumericValue } from '@usertour/helpers';

import { MARGIN_KEY_MAPPING, MARGIN_POSITIONS } from '../constants/margin';
import type { MarginConfig, MarginStyleProps } from '../types/margin';

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
    const marginValue = margin[position];
    const numericValue = toNumericValue(marginValue);
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
