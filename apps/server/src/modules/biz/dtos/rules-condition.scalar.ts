import GraphQLJSON from 'graphql-type-json';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

export const RulesConditionScalar = namedScalar(
  GraphQLJSON,
  'RulesCondition',
  'One rule of a condition list: its type, operator and operands, with nested groups.',
);
