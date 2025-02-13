import type { Dimensions } from './types';

import { getCssDimensions } from './getCssDimensions';

export function getDimensions(element: Element): Dimensions {
  return getCssDimensions(element);
}
