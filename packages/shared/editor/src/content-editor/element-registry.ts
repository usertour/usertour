// Element registry for O(1) lookup of element renderers

import type { ComponentType } from 'react';

import { ContentEditorElementType, type ContentEditorElement } from '../types/editor';
import { ContentEditorButton } from './components/button';
import { ContentEditorColumn, ContentEditorColumnOverlay } from './components/column';
import { ContentEditorEmbed } from './components/embed';
import { ContentEditorGroup, ContentEditorGroupOverlay } from './components/group';
import { ContentEditorImage } from './components/image';
import { ContentEditorMultiLineText } from './components/multi-line-text';
import { ContentEditorMultipleChoice } from './components/multiple-choice';
import { ContentEditorNPS } from './components/nps';
import { ContentEditorRichText } from './components/rich-text';
import { ContentEditorScale } from './components/scale';
import { ContentEditorSingleLineText } from './components/single-line-text';
import { ContentEditorStarRating } from './components/star-rating';

// Base props interface for element components
export interface ElementRenderProps {
  element: ContentEditorElement;
  id: string;
  path: number[];
}

/**
 * Generic component type for element registry.
 *
 * Why `any`: Each element component (Group, Column, Button, etc.) has different
 * props extending ElementRenderProps. TypeScript's contravariance prevents using
 * a union or base type here. This is a common pattern for component registries.
 */
type RegistryComponent = ComponentType<any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// Create Map for O(1) lookup of renderers
const elementRendererMap = new Map<ContentEditorElementType, RegistryComponent>([
  [ContentEditorElementType.GROUP, ContentEditorGroup],
  [ContentEditorElementType.COLUMN, ContentEditorColumn],
  [ContentEditorElementType.BUTTON, ContentEditorButton],
  [ContentEditorElementType.IMAGE, ContentEditorImage],
  [ContentEditorElementType.TEXT, ContentEditorRichText],
  [ContentEditorElementType.EMBED, ContentEditorEmbed],
  [ContentEditorElementType.NPS, ContentEditorNPS],
  [ContentEditorElementType.STAR_RATING, ContentEditorStarRating],
  [ContentEditorElementType.SCALE, ContentEditorScale],
  [ContentEditorElementType.SINGLE_LINE_TEXT, ContentEditorSingleLineText],
  [ContentEditorElementType.MULTI_LINE_TEXT, ContentEditorMultiLineText],
  [ContentEditorElementType.MULTIPLE_CHOICE, ContentEditorMultipleChoice],
]);

// O(1) lookup function for element renderer
export const getElementRenderer = (
  type: ContentEditorElementType,
): RegistryComponent | undefined => {
  return elementRendererMap.get(type);
};

// Export overlay components for drag operations
export { ContentEditorGroupOverlay, ContentEditorColumnOverlay };
