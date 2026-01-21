// Element registry for O(1) lookup of element renderers and serializers

import type { ComponentType } from 'react';

import { ContentEditorElementType, type ContentEditorElement } from '../types/editor';
import { ContentEditorButton, ContentEditorButtonSerialize } from './components/button';
import {
  ContentEditorColumn,
  ContentEditorColumnOverlay,
  ContentEditorColumnSerialize,
} from './components/column';
import { ContentEditorEmbed, ContentEditorEmbedSerialize } from './components/embed';
import {
  ContentEditorGroup,
  ContentEditorGroupOverlay,
  ContentEditorGroupSerialize,
} from './components/group';
import { ContentEditorImage, ContentEditorImageSerialize } from './components/image';
import {
  ContentEditorMultiLineText,
  ContentEditorMultiLineTextSerialize,
} from './components/multi-line-text';
import {
  ContentEditorMultipleChoice,
  ContentEditorMultipleChoiceSerialize,
} from './components/multiple-choice';
import { ContentEditorNPS, ContentEditorNPSSerialize } from './components/nps';
import { ContentEditorRichText, ContentEditorRichTextSerialize } from './components/rich-text';
import { ContentEditorScale, ContentEditorScaleSerialize } from './components/scale';
import {
  ContentEditorSingleLineText,
  ContentEditorSingleLineTextSerialize,
} from './components/single-line-text';
import {
  ContentEditorStarRating,
  ContentEditorStarRatingSerialize,
} from './components/star-rating';

// Base props interfaces for element components
export interface ElementRenderProps {
  element: ContentEditorElement;
  id: string;
  path: number[];
}

export interface ElementSerializeProps {
  element: ContentEditorElement;
  onClick?: (element: ContentEditorElement, value?: unknown) => Promise<void>;
}

// Generic component type for registry (allows different prop structures)
// biome-ignore lint/suspicious/noExplicitAny: Required for polymorphic component registry
type RegistryComponent = ComponentType<any>;

// Element mapping interface
export interface ElementMapping {
  type: ContentEditorElementType;
  render: RegistryComponent;
  serialize: RegistryComponent;
}

// Create element mappings array (for backward compatibility export)
export const contentEditorElements: ElementMapping[] = [
  {
    type: ContentEditorElementType.GROUP,
    render: ContentEditorGroup,
    serialize: ContentEditorGroupSerialize,
  },
  {
    type: ContentEditorElementType.COLUMN,
    render: ContentEditorColumn,
    serialize: ContentEditorColumnSerialize,
  },
  {
    type: ContentEditorElementType.BUTTON,
    render: ContentEditorButton,
    serialize: ContentEditorButtonSerialize,
  },
  {
    type: ContentEditorElementType.IMAGE,
    render: ContentEditorImage,
    serialize: ContentEditorImageSerialize,
  },
  {
    type: ContentEditorElementType.TEXT,
    render: ContentEditorRichText,
    serialize: ContentEditorRichTextSerialize,
  },
  {
    type: ContentEditorElementType.EMBED,
    render: ContentEditorEmbed,
    serialize: ContentEditorEmbedSerialize,
  },
  {
    type: ContentEditorElementType.NPS,
    render: ContentEditorNPS,
    serialize: ContentEditorNPSSerialize,
  },
  {
    type: ContentEditorElementType.STAR_RATING,
    render: ContentEditorStarRating,
    serialize: ContentEditorStarRatingSerialize,
  },
  {
    type: ContentEditorElementType.SCALE,
    render: ContentEditorScale,
    serialize: ContentEditorScaleSerialize,
  },
  {
    type: ContentEditorElementType.SINGLE_LINE_TEXT,
    render: ContentEditorSingleLineText,
    serialize: ContentEditorSingleLineTextSerialize,
  },
  {
    type: ContentEditorElementType.MULTI_LINE_TEXT,
    render: ContentEditorMultiLineText,
    serialize: ContentEditorMultiLineTextSerialize,
  },
  {
    type: ContentEditorElementType.MULTIPLE_CHOICE,
    render: ContentEditorMultipleChoice,
    serialize: ContentEditorMultipleChoiceSerialize,
  },
];

// Create Maps for O(1) lookup
const elementRendererMap = new Map<ContentEditorElementType, RegistryComponent>(
  contentEditorElements.map((mapping) => [mapping.type, mapping.render]),
);

const elementSerializerMap = new Map<ContentEditorElementType, RegistryComponent>(
  contentEditorElements.map((mapping) => [mapping.type, mapping.serialize]),
);

// O(1) lookup functions
export const getElementRenderer = (
  type: ContentEditorElementType,
): RegistryComponent | undefined => {
  return elementRendererMap.get(type);
};

export const getElementSerializer = (
  type: ContentEditorElementType,
): RegistryComponent | undefined => {
  return elementSerializerMap.get(type);
};

// Export overlay and serialize components for drag operations
export {
  ContentEditorGroupOverlay,
  ContentEditorColumnOverlay,
  ContentEditorGroupSerialize,
  ContentEditorColumnSerialize,
};
