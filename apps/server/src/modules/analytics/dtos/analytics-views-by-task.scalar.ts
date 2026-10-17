import GraphQLJSON from 'graphql-type-json';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

export const AnalyticsViewsByTaskScalar = namedScalar(
  GraphQLJSON,
  'AnalyticsViewsByTask',
  "One checklist task's view and completion counts.",
);
