import GraphQLJSON from 'graphql-type-json';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

export const ContentQuestionAnalyticsScalar = namedScalar(
  GraphQLJSON,
  'ContentQuestionAnalytics',
  "One question's response analytics: the question, its answer counts and the daily averages.",
);
