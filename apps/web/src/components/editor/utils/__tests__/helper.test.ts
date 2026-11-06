let minted = 0;
jest.mock('@usertour/helpers', () => ({
  cuid: () => `cvid-${++minted}`,
  uuidV4: () => 'uuid',
  defaultColumn: { type: 'column' },
}));

import { ContentEditorElementType, type ContentEditorElement } from '../../types/editor';
import { withBlockIdentity } from '../helper';

const button = (data: Record<string, unknown>) =>
  ({
    type: ContentEditorElementType.BUTTON,
    data: { text: 'Next', ...data },
  }) as ContentEditorElement;
const cvidOf = (element: ContentEditorElement) =>
  (element as { data?: { cvid?: string } }).data?.cvid;

describe('withBlockIdentity', () => {
  it('gives a new button a cvid', () => {
    expect(cvidOf(withBlockIdentity(button({})))).toMatch(/^cvid-/);
  });

  it('gives a button built from an existing one a cvid of its own', () => {
    // "Add left" / "add right" hand the button they sit on to the insert as
    // the template of the new one. Two buttons under one cvid are counted as
    // one in the click analytics.
    const existing = withBlockIdentity(button({}));
    const sibling = withBlockIdentity(existing);

    expect(cvidOf(sibling)).toMatch(/^cvid-/);
    expect(cvidOf(sibling)).not.toBe(cvidOf(existing));
    expect((sibling as { data: { text: string } }).data.text).toBe('Next');
  });

  it('passes every other block through untouched', () => {
    const image = { type: ContentEditorElementType.IMAGE, url: '' } as ContentEditorElement;
    expect(withBlockIdentity(image)).toBe(image);
  });
});
