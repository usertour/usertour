import { cuid, defaultColumn, uuidV4 } from '@usertour/helpers';
import {
  type ContentEditorButtonElement,
  type ContentEditorElement,
  ContentEditorElementType,
  ContentEditorRoot,
  ContentEditorRootColumn,
  ContentEditorRootElement,
} from '../types/editor';

/**
 * A button carries a stable `cvid` from the moment it is created: the key its
 * clicks are counted under, kept across text edits and translations (a
 * question block's cvid plays the same role). Other blocks pass through.
 *
 * Every element handed to an insert becomes a new block, so it always gets a
 * cvid of its own: "add left" and "add right" pass the button they sit on as
 * the template, and a copy that kept its cvid would be counted as that button.
 */
export const withBlockIdentity = (element: ContentEditorElement): ContentEditorElement => {
  if (element.type !== ContentEditorElementType.BUTTON) {
    return element;
  }
  const button = element as ContentEditorButtonElement;
  return { ...button, data: { ...button.data, cvid: cuid() } } as ContentEditorElement;
};

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
