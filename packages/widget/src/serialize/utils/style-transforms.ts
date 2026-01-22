// Style transformation utilities for serialize components

import { MARGIN_KEY_MAPPING, MARGIN_POSITIONS } from '../constants';
import type { MarginConfig, MarginStyleProps } from '../types';

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
