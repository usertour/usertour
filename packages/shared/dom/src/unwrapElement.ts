import { isElement } from './is';
import type { VirtualElement } from './types';

export function unwrapElement(element: Element | VirtualElement) {
  return !isElement(element) ? element.contextElement : element;
}
