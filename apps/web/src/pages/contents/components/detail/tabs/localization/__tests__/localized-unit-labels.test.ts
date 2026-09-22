import { TRANSLATION_UNIT_FIELDS } from '@usertour/helpers';

import { FIELD_LABEL_KEYS } from '../localized-unit-labels';

describe('FIELD_LABEL_KEYS', () => {
  // The type already forces an entry per field; this keeps a cast from
  // sneaking a partial table past it.
  it('names every field the walkers can emit', () => {
    for (const field of TRANSLATION_UNIT_FIELDS) {
      expect(Object.prototype.hasOwnProperty.call(FIELD_LABEL_KEYS, field)).toBe(true);
    }
  });

  it('labels every field that is not a bare rich-text run or a media element', () => {
    const unlabeled = TRANSLATION_UNIT_FIELDS.filter((field) => FIELD_LABEL_KEYS[field] === null);
    expect(unlabeled).toEqual(['text', 'button.text', 'image.url', 'embed.url']);
  });
});
