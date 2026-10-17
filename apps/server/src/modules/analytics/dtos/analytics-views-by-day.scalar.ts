import GraphQLJSON from 'graphql-type-json';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

export const AnalyticsViewsByDayScalar = namedScalar(
  GraphQLJSON,
  'AnalyticsViewsByDay',
  "One day's view and completion counts.",
);
