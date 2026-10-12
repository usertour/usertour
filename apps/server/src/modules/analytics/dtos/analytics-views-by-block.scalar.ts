import GraphQLJSON from 'graphql-type-json';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

export const AnalyticsViewsByBlockScalar = namedScalar(
  GraphQLJSON,
  'AnalyticsViewsByBlock',
  "One resource center block's click counts.",
);
