import GraphQLJSON from 'graphql-type-json';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

export const StepTargetScalar = namedScalar(
  GraphQLJSON,
  'StepTarget',
  "A step's element target: the selector strategy and its screenshot reference.",
);
