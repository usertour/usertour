import { GraphQLInt } from 'graphql';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

export const AttributeBizTypeScalar = namedScalar(
  GraphQLInt,
  'AttributeBizType',
  'The integer that encodes what an attribute describes: 1 user, 2 company, 3 membership, 4 event.',
);
