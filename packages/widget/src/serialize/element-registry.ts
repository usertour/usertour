// Element registry for O(1) lookup of element serializers

import type { ComponentType } from 'react';

import { ContentEditorElementType } from '@usertour/types';

import {
  ButtonSerialize,
  ColumnSerialize,
  EmbedSerialize,
  GroupSerialize,
  ImageSerialize,
  MultiLineTextSerialize,
  MultipleChoiceSerialize,
  NPSSerialize,
  RichTextSerialize,
  ScaleSerialize,
  SingleLineTextSerialize,
  StarRatingSerialize,
} from './components';

// Generic component type for registry (allows different prop structures)
// biome-ignore lint/suspicious/noExplicitAny: Required for polymorphic component registry
type RegistryComponent = ComponentType<any>;

// Element mapping interface
export interface ElementSerializeMapping {
  type: ContentEditorElementType;
  serialize: RegistryComponent;
}

// Create element mappings array
export const contentEditorSerializeElements: ElementSerializeMapping[] = [
  {
    type: ContentEditorElementType.GROUP,
    serialize: GroupSerialize,
  },
  {
    type: ContentEditorElementType.COLUMN,
    serialize: ColumnSerialize,
  },
  {
    type: ContentEditorElementType.BUTTON,
    serialize: ButtonSerialize,
  },
  {
    type: ContentEditorElementType.IMAGE,
    serialize: ImageSerialize,
  },
  {
    type: ContentEditorElementType.TEXT,
    serialize: RichTextSerialize,
  },
  {
    type: ContentEditorElementType.EMBED,
    serialize: EmbedSerialize,
  },
  {
    type: ContentEditorElementType.NPS,
    serialize: NPSSerialize,
  },
  {
    type: ContentEditorElementType.STAR_RATING,
    serialize: StarRatingSerialize,
  },
  {
    type: ContentEditorElementType.SCALE,
    serialize: ScaleSerialize,
  },
  {
    type: ContentEditorElementType.SINGLE_LINE_TEXT,
    serialize: SingleLineTextSerialize,
  },
  {
    type: ContentEditorElementType.MULTI_LINE_TEXT,
    serialize: MultiLineTextSerialize,
  },
  {
    type: ContentEditorElementType.MULTIPLE_CHOICE,
    serialize: MultipleChoiceSerialize,
  },
];

// Create Map for O(1) lookup
const elementSerializerMap = new Map<ContentEditorElementType, RegistryComponent>(
  contentEditorSerializeElements.map((mapping) => [mapping.type, mapping.serialize]),
);

// O(1) lookup function
export const getElementSerializer = (
  type: ContentEditorElementType,
): RegistryComponent | undefined => {
  return elementSerializerMap.get(type);
};

// Export serialize components for direct use
export { ColumnSerialize, GroupSerialize };
