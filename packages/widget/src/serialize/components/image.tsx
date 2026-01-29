// Image serialize component for SDK rendering

import type { ContentEditorImageElement } from '@usertour/types';
import { memo } from 'react';

import { DEFAULT_WIDTH, WIDTH_TYPES } from '../constants';
import type { MarginStyleProps } from '../types';
import { ensureDimensionWithDefaults, getWidthStyle, transformMarginStyle } from '../utils';

// Types
interface ImageStyle extends MarginStyleProps {
  width?: string;
}

// Utility function for transforming element to style
const transformsStyle = (element: ContentEditorImageElement): ImageStyle => {
  const style: ImageStyle = {};

  // Handle width - only process if element.width exists (preserve backward compatibility)
  if (element.width) {
    const width = ensureDimensionWithDefaults(element.width);
    const widthStyle = getWidthStyle(width);
    if (widthStyle) {
      style.width = widthStyle;
    } else if (element.width.type === WIDTH_TYPES.PERCENT) {
      // Default to 100% if type is percent but no value
      style.width = `${DEFAULT_WIDTH}%`;
    }
  }

  // Handle margins using shared utility
  const marginStyle = transformMarginStyle(element.margin);
  return { ...style, ...marginStyle };
};

export interface ImageSerializeProps {
  className?: string;
  element: ContentEditorImageElement;
}

export const ImageSerialize = memo<ImageSerializeProps>((props) => {
  const { element, className } = props;

  if (!element.url) {
    return null;
  }

  return (
    <img src={element.url} style={transformsStyle(element)} className={className} alt="Content" />
  );
});

ImageSerialize.displayName = 'ImageSerialize';
