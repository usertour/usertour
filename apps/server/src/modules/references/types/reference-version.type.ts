import type { ReferenceLocation } from './reference-location.type';

/** Which of a content's live versions holds a reference, as a GraphQL enum object typed by the location's union. */
export const ReferenceVersion: { [Value in NonNullable<ReferenceLocation['version']>]: Value } = {
  draft: 'draft',
  published: 'published',
  draftAndPublished: 'draftAndPublished',
};
