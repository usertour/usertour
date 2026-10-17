import GraphQLJSON from 'graphql-type-json';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

export const ContentConfigScalar = namedScalar(
  GraphQLJSON,
  'ContentConfig',
  "A content's config object (the roll-window settings).",
);
