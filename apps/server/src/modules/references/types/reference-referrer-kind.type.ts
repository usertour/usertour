import type { ReferenceRow } from './reference-row.type';

/** The referrer kinds as a GraphQL enum object; typed by the row's union so neither can grow alone. */
export const ReferenceReferrerKind: { [Value in ReferenceRow['referrerKind']]: Value } = {
  content: 'content',
  segment: 'segment',
  theme: 'theme',
};
