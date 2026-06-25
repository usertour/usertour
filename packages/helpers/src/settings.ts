import { ContentEditorColumnElement, ContentEditorElementType, Step } from '@usertour/types';

/**
 * Default column element — every column the builder creates seeds these defaults:
 * `fill` width (so the column fills its row and its content wraps) and centered
 * content. Single source of truth so the API codec seeds implicit columns the same
 * way and API-authored content renders like builder-authored content. To add a new
 * column default (e.g. alignItems), do it here once and both paths follow.
 */
export const defaultColumn: ContentEditorColumnElement = {
  type: ContentEditorElementType.COLUMN,
  width: { type: 'fill' },
  justifyContent: 'justify-center',
};

export const defaultStep: Step = {
  name: 'step',
  type: 'tooltip',
  sequence: 0,
  setting: {
    height: 0,
    width: undefined, // Auto - use theme default width
    skippable: true,
    enabledBackdrop: false,
    enabledBlockTarget: false,
    explicitCompletionStep: false,
    align: 'center',
    side: 'bottom',
    sideOffset: 0,
    alignOffset: 0,
    alignType: 'auto',
    position: 'center',
    positionOffsetX: 0,
    positionOffsetY: 0,
  },
  data: [
    {
      type: 'paragraph',
      children: [{ text: '' }],
    },
  ],
  target: {
    selectors: null,
    content: '',
    sequence: '1st',
    precision: 'stricter',
    isDynamicContent: false,
    customSelector: '',
    type: 'auto',
  },
};
