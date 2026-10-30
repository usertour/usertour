import GraphQLJSON from 'graphql-type-json';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

export const AnalyticsViewsByButtonScalar = namedScalar(
  GraphQLJSON,
  'AnalyticsViewsByButton',
  "One embed button's click counts.",
);
