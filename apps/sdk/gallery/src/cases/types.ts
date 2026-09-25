import type { ComponentType, ReactElement } from 'react';

export type GalleryCase = {
  /** The customer page. Mark the element a widget attaches to with `data-gallery-target`. */
  host: ComponentType;
  /** The widget under test. Built after the host is in the DOM, so its target exists. */
  widget: () => ReactElement;
};

export const findTarget = () => document.querySelector('[data-gallery-target]');
