// Read-only serialized image component for SDK

/* eslint-disable @next/next/no-img-element */
import type { ContentEditorImageElement } from '../../../types/editor';
import type { MarginStyleProps } from '../../types';
import { DEFAULT_WIDTH, WIDTH_TYPES } from '../../constants';
import { ensureDimensionWithDefaults, getWidthStyle, transformMarginStyle } from '../../utils';

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

export type ContentEditorImageSerializeType = {
  className?: string;
  children?: React.ReactNode;
  element: ContentEditorImageElement;
};

export const ContentEditorImageSerialize = (props: ContentEditorImageSerializeType) => {
  const { element, className } = props;

  if (!element.url) {
    return null;
  }

  return (
    <img src={element.url} style={transformsStyle(element)} className={className} alt="Content" />
  );
};

ContentEditorImageSerialize.displayName = 'ContentEditorImageSerialize';
