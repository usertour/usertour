import { ContentDataType, StepContentType } from '@usertour/types';

import { getPreviewStep } from '../content';

const hidden = { id: 'hidden', type: StepContentType.HIDDEN };
const inline = { id: 'inline', type: StepContentType.INLINE };

describe('getPreviewStep', () => {
  it("renders an embed's first visible step, skipping hidden ones", () => {
    expect(getPreviewStep(ContentDataType.EMBED, [hidden, inline])).toBe(inline);
  });

  it('has no step for an embed with only hidden steps', () => {
    expect(getPreviewStep(ContentDataType.EMBED, [hidden])).toBeUndefined();
  });

  it('keeps the first step for other content types', () => {
    expect(getPreviewStep(ContentDataType.FLOW, [hidden, inline])).toBe(hidden);
  });
});
