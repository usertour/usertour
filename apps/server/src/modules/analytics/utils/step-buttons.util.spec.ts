import { ContentEditorElementType, ContentEditorRoot } from '@usertour/types';

import { extractStepButtons } from './step-buttons.util';

const button = (cvid: string | undefined, text: string) => ({
  element: { type: ContentEditorElementType.BUTTON, data: { cvid, text, actions: [] } },
  children: null,
});
const text = () => ({ element: { type: ContentEditorElementType.TEXT, data: [] }, children: null });
const group = (...columns: unknown[][]) => ({
  element: { type: ContentEditorElementType.GROUP },
  children: columns.map((items) => ({
    element: { type: ContentEditorElementType.COLUMN },
    children: items,
  })),
});
const tree = (...groups: unknown[]) => groups as unknown as ContentEditorRoot[];

describe('extractStepButtons', () => {
  it('collects buttons across groups and columns in document order, skipping other elements', () => {
    const data = tree(
      group([text(), button('b1', 'Next')], [button('b2', 'Skip')]),
      group([text()]),
      group([button(undefined, 'No cvid'), button('b3', 'Done')]),
    );

    expect(extractStepButtons(data).map((element) => element.data.text)).toEqual([
      'Next',
      'Skip',
      'No cvid',
      'Done',
    ]);
  });

  it('tolerates a column item without an element and a step without a tree', () => {
    const data = tree(group([{ children: null }, button('b1', 'Next')]));

    expect(extractStepButtons(data).map((element) => element.data.cvid)).toEqual(['b1']);
    expect(extractStepButtons(null as unknown as ContentEditorRoot[])).toEqual([]);
  });
});
