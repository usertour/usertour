import type { CSSProperties } from 'react';
import type { CustomText } from '../types/slate';

/**
 * Get CSS styles for text formatting marks
 * Used by both Leaf component (editor) and serializeLeaf (serialization)
 */
export const getTextStyles = (node: Partial<CustomText>): CSSProperties => {
  const style: CSSProperties = {};

  if (node.bold) {
    style.fontWeight = 'bold';
  }

  if (node.italic) {
    style.fontStyle = 'italic';
  }

  if (node.underline) {
    style.textDecoration = 'underline';
  }

  if (node.color) {
    style.color = node.color;
  }

  return style;
};
