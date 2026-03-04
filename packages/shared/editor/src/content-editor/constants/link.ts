// Link-related constants shared across content editor and richtext editor

import type { Descendant } from 'slate';

/**
 * Initial URL value for link editor
 */
export const INITIAL_LINK_URL_VALUE: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: 'https://' }],
  },
];

/**
 * Link open type constants
 */
export const LINK_OPEN_TYPE = {
  SAME: 'same',
  NEW: 'new',
} as const;

export type LinkOpenType = (typeof LINK_OPEN_TYPE)[keyof typeof LINK_OPEN_TYPE];
