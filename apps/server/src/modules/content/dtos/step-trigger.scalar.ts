import GraphQLJSON from 'graphql-type-json';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

export const StepTriggerScalar = namedScalar(
  GraphQLJSON,
  'StepTrigger',
  'One trigger of a step: its conditions and the actions they fire.',
);
