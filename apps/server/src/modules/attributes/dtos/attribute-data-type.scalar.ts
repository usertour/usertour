import { GraphQLInt } from 'graphql';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

export const AttributeDataTypeScalar = namedScalar(
  GraphQLInt,
  'AttributeDataType',
  'The integer that encodes an attribute value type: 1 number, 2 string, 3 boolean, 4 list, 5 datetime, 6 random A/B, 7 random number.',
);
