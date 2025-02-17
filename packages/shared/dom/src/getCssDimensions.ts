import type { Dimensions } from './types';

import { getComputedStyle } from './getComputedStyle';
import { isHTMLElement } from './is';
import { round } from './math';

export function getCssDimensions(element: Element): Dimensions & { $: boolean } {
  const css = getComputedStyle(element);
  // In testing environments, the `width` and `height` properties are empty
  // strings for SVG elements, returning NaN. Fallback to `0` in this case.
  let width = Number.parseFloat(css.width) || 0;
  let height = Number.parseFloat(css.height) || 0;
  const hasOffset = isHTMLElement(element);
  const offsetWidth = hasOffset ? element.offsetWidth : width;
  const offsetHeight = hasOffset ? element.offsetHeight : height;
  const shouldFallback = round(width) !== offsetWidth || round(height) !== offsetHeight;

  if (shouldFallback) {
    width = offsetWidth;
    height = offsetHeight;
  }

  return {
    width,
    height,
    $: shouldFallback,
  };
}
