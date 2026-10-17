import GraphQLJSON from 'graphql-type-json';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

export const LocalizedContentScalar = namedScalar(
  GraphQLJSON,
  'LocalizedContent',
  "A version's translated payload: the flow steps or the type-specific data, per translation unit.",
);
