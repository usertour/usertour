import {
  ContentEditorButtonElement,
  ContentEditorElementType,
  ContentEditorRoot,
} from '@usertour/types';

/**
 * The button elements of one step's editor tree (group → column → element),
 * in document order. The tree is the step's `data`; a step without one yields
 * nothing.
 */
export const extractStepButtons = (data: ContentEditorRoot[]): ContentEditorButtonElement[] => {
  if (!Array.isArray(data)) {
    return [];
  }
  const buttons: ContentEditorButtonElement[] = [];
  for (const group of data) {
    for (const column of group.children ?? []) {
      for (const item of column.children ?? []) {
        if (item.element?.type === ContentEditorElementType.BUTTON) {
          buttons.push(item.element);
        }
      }
    }
  }
  return buttons;
};
