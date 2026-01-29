// Text style utilities for serialize components

import type { CSSProperties } from 'react';

import type { TextNode } from '../types';

/**
 * Get CSS styles for text formatting marks
 * Used by serializeLeaf for richtext serialization
 */
export const getTextStyles = (node: Partial<TextNode>): CSSProperties => {
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
