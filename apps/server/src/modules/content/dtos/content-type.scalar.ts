import { GraphQLString } from 'graphql';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

/**
 * A content type word as stored (`flow`, `checklist`, `resource-center`, …).
 * A named String rather than an enum: one value carries a hyphen, which a
 * GraphQL enum value name cannot.
 */
export const ContentTypeScalar = namedScalar(
  GraphQLString,
  'ContentType',
  'The content type word: flow, checklist, launcher, banner, tracker, resource-center or announcement.',
);
