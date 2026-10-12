import GraphQLJSON from 'graphql-type-json';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

export const VersionConfigScalar = namedScalar(
  GraphQLJSON,
  'VersionConfig',
  "A version's config object: start and hide rules, auto-start and the type-specific settings.",
);
