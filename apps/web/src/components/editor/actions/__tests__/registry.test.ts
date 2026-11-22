import { CONTENT_ACTION_CAPABILITIES } from '@usertour/helpers';

import { listAvailableSchemas } from '../registry';
import '../types/banner-dismiss';
import '../types/checklist-dismiss';
import '../types/embed-dismiss';
import '../types/flow-dismiss';
import '../types/launcher-dismiss';

// Only what the dismiss modules register is under test; the UI they import is stubbed.
jest.mock('@usertour/icons', () => ({ CloseCircleIcon: () => null }));
jest.mock('@/components/rules', () => ({ summaryTextClass: '' }));

describe('the dismissal of each content type', () => {
  // listAvailableSchemas drops a type that has no schema without a word, so a
  // dismissal nobody registered is one the builder cannot add.
  for (const [type, capability] of Object.entries(CONTENT_ACTION_CAPABILITIES)) {
    const variant = capability.dismissVariant;
    if (!variant) {
      continue;
    }
    it(`is in the ${type} action menu`, () => {
      expect(listAvailableSchemas([variant]).map((schema) => schema.type)).toEqual([variant]);
    });
  }
});
