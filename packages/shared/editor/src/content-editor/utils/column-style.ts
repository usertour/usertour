// Column style transformation utilities

import { toNumericValue } from '@usertour/helpers';
import type { PaddingStyleProps } from '@usertour-packages/widget';
import { transformPaddingStyle } from '@usertour-packages/widget';

import type { ContentEditorColumnElement } from '../../types/editor';
import { WIDTH_TYPES } from '../constants';
import { ensureWidthWithDefaults } from './dimension';

export interface ColumnStyle extends PaddingStyleProps {
  marginBottom: string;
  marginRight?: string;
  width?: string;
  flex?: string;
  minWidth: string;
}

/**
 * Transforms column element properties to CSS style object
 */
export const transformColumnStyle = (element: ContentEditorColumnElement): ColumnStyle => {
  const marginRightValue = toNumericValue(element.style?.marginRight);
  const style: ColumnStyle = {
    marginBottom: '0px',
    marginRight: marginRightValue !== undefined ? `${marginRightValue}px` : undefined,
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
