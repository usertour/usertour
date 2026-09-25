import type { DefinitionReference } from '@usertour/types';

import { referenceHref } from '../reference-href';

const scope = { projectId: 'project-1', environmentId: 'env-1' };

const reference = (overrides: Partial<DefinitionReference>): DefinitionReference => ({
  referrerKind: 'content',
  id: 'id-1',
  name: 'Name',
  contentType: null,
  segmentBizType: null,
  locations: [],
  ...overrides,
});

describe('referenceHref', () => {
  it("links content to its detail page under the content type's route", () => {
    expect(referenceHref(reference({ contentType: 'flow' }), scope)).toBe(
      '/env/env-1/flows/id-1/detail',
    );
    expect(referenceHref(reference({ contentType: 'checklist' }), scope)).toBe(
      '/env/env-1/checklists/id-1/detail',
    );
  });

  it('links a segment to the user or company list it lives in', () => {
    expect(
      referenceHref(reference({ referrerKind: 'segment', segmentBizType: 'user' }), scope),
    ).toBe('/env/env-1/users?segment_id=id-1');
    expect(
      referenceHref(reference({ referrerKind: 'segment', segmentBizType: 'company' }), scope),
    ).toBe('/env/env-1/companies?segment_id=id-1');
  });

  it('links a theme to its settings page', () => {
    expect(referenceHref(reference({ referrerKind: 'theme' }), scope)).toBe(
      '/project/project-1/settings/theme/id-1',
    );
  });
});
