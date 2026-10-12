import GraphQLJSON from 'graphql-type-json';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

export const AnalyticsViewsByStepScalar = namedScalar(
  GraphQLJSON,
  'AnalyticsViewsByStep',
  "One step's view and completion counts.",
);
