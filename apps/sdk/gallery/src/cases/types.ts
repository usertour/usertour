import type { ThemeTypesSetting } from '@usertour/types';
import type { ComponentType, ReactElement } from 'react';

/** What every case receives: the theme picked by `?theme=` and the raw query. */
export type CaseParams = {
  theme: ThemeTypesSetting;
  search: URLSearchParams;
};

export type GalleryCase = {
  /** The customer page. Mark the element a widget attaches to with `data-gallery-target`. */
  host: ComponentType;
  /** The widget under test. Built after the host is in the DOM, so its target exists. */
  widget: (params: CaseParams) => ReactElement;
};

export const findTarget = () => document.querySelector('[data-gallery-target]');
