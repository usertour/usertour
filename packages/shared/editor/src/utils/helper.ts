import { uuidV4 } from '@usertour/helpers';
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
  element: {
    type: 'column',
    width: { type: 'fill' },
    justifyContent: 'justify-center',
    style: {},
  },
  children: [],
} as ContentEditorRootColumn;

export const EmptyButton = {
  element: {
    type: 'button',
    data: {
      action: 'next',
      text: 'Next',
      type: 'default',
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
    data: [{ type: 'paragraph', children: [{ text: 'Write text here' }] }],
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

export const groupData = [
  {
    type: 'group',
    isFirst: true,
    isLast: true,
    children: [
      {
        type: 'column',
        width: { type: 'fill', value: 50 },

        justifyContent: 'justify-center',
        style: { marginRight: '30' },
        children: [
          {
            type: 'paragraph',
            children: [{ text: 'Write text here' }],
          },
        ],
      },
      {
        type: 'column',
        width: { type: 'fill', value: 50 },
        justifyContent: 'justify-center',
        style: { marginRight: '30' },
        children: [
          {
            type: 'paragraph',
            children: [{ text: 'Write text here' }],
          },
        ],
      },
    ],
  },
];
