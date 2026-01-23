// Column style transformation utilities for serialize components

import type { ContentEditorColumnElement } from '@usertour/types';

import { WIDTH_TYPES } from '../constants';
import type { ColumnStyle } from '../types';
import { ensureWidthWithDefaults } from './dimension';
import { transformPaddingStyle } from './style-transforms';

/**
 * Transforms column element properties to CSS style object
 */
export const transformColumnStyle = (element: ContentEditorColumnElement): ColumnStyle => {
  const style: ColumnStyle = {
    marginBottom: '0px',
    marginRight: element.style?.marginRight ? `${element.style.marginRight}px` : undefined,
    width: 'auto',
    flex: '0 0 auto',
    minWidth: '0',
  };

  const width = ensureWidthWithDefaults(element.width);

  if (width.type === WIDTH_TYPES.PERCENT && width.value) {
    style.width = `${width.value}%`;
  } else if (width.type === WIDTH_TYPES.PIXELS && width.value) {
    style.width = `${width.value}px`;
  } else if (width.type === WIDTH_TYPES.FILL) {
    style.flex = '1 0 0px';
  }

  // Add padding styles
  const paddingStyle = transformPaddingStyle(element.padding);

  return { ...style, ...paddingStyle };
};
