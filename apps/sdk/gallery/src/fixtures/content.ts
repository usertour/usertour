import { defaultColumn } from '@usertour/helpers';
import {
  type ContentEditorElement,
  ContentEditorElementType,
  type ContentEditorRoot,
} from '@usertour/types';

/** One group row holding one default (builder-seeded) column of elements. */
export const row = (...elements: ContentEditorElement[]): ContentEditorRoot => ({
  element: { type: ContentEditorElementType.GROUP },
  children: [
    {
      element: defaultColumn,
      children: elements.map((element) => ({ element, children: null })),
    },
  ],
});

export const paragraph = (text: string): ContentEditorElement => ({
  type: ContentEditorElementType.TEXT,
  data: [{ type: 'paragraph', children: [{ text }] }],
});

export const strongParagraph = (text: string): ContentEditorElement => ({
  type: ContentEditorElementType.TEXT,
  data: [{ type: 'paragraph', children: [{ text, bold: true }] }],
});

export const button = (text: string): ContentEditorElement => ({
  type: ContentEditorElementType.BUTTON,
  data: { text, type: 'primary', actions: [] },
});

/** The shape most steps take: a line of copy and a primary button. */
export const textAndButton: ContentEditorRoot[] = [
  row(paragraph('Welcome aboard! This step points at the element next to it.')),
  row(button('Next')),
];

/** A one-line announcement, the shape most banners take. */
export const oneLine: ContentEditorRoot[] = [
  row(paragraph('Scheduled maintenance on Sunday, 02:00–04:00 UTC.')),
];

/** Several stacked rows: a title, a body line and a call to action. */
export const stackedRows: ContentEditorRoot[] = [
  row(strongParagraph('New: shared dashboards')),
  row(paragraph('Invite your team to a dashboard and edit it together in real time.')),
  row(button('Try it')),
];
