import { defaultColumn, uuidV4 } from '@usertour/helpers';
import {
  ContentEditorRoot,
  ContentEditorRootColumn,
  ContentEditorRootElement,
} from '../types/editor';

export const EmptyGroup = {
  element: { type: 'group' },
  children: [],
} as ContentEditorRoot;

export const EmptyColumn = {
  // Seed the shared column defaults (fill width + centered) so the builder and the
  // API codec stay in lockstep; `style` stays builder-local.
  element: { ...defaultColumn, style: {} },
  children: [],
} as ContentEditorRootColumn;

export const EmptyButton = {
  element: {
    type: 'button',
    data: {
      action: 'next',
      text: 'Next',
      type: 'primary',
    },
  },
} as ContentEditorRootElement;

export const EmptyImage = {
  element: { type: 'image', url: '' },
} as ContentEditorRootElement;

export const EmptyEmbed = {
  element: { type: 'embed', url: '' },
} as ContentEditorRootElement;

export const EmptyText = {
  element: {
    type: 'text',
    data: [{ type: 'paragraph', children: [{ text: '' }] }],
  },
} as ContentEditorRootElement;

export const createNewGroup = (children: ContentEditorRootElement[]) => {
  return {
    ...EmptyGroup,
    id: uuidV4(),
    children: [
      {
        ...EmptyColumn,
        id: uuidV4(),
        children: [...children],
      },
    ],
  };
};

export const createNewColumn = (children: ContentEditorRootElement[]) => {
  return {
    ...EmptyColumn,
    id: uuidV4(),
    children: [...children],
  };
};

export const createGroupFromColumn = (column: ContentEditorRootColumn) => {
  return {
    ...EmptyGroup,
    id: uuidV4(),
    children: [column],
  };
};

export const defaultInitialValue = [
  {
    ...EmptyGroup,
    children: [
      {
        ...EmptyColumn,
        children: [
          {
            ...EmptyText,
          },
        ],
      },
      {
        ...EmptyColumn,
        children: [
          {
            ...EmptyEmbed,
          },
        ],
      },
    ],
  },
  {
    ...EmptyGroup,
    children: [
      {
        ...EmptyColumn,
        children: [
          {
            ...EmptyButton,
          },
        ],
      },
      {
        ...EmptyColumn,
        children: [
          {
            ...EmptyImage,
          },
        ],
      },
    ],
  },
] as ContentEditorRoot[];
