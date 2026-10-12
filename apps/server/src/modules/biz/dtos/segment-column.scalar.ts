import GraphQLJSON from 'graphql-type-json';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

export const SegmentColumnScalar = namedScalar(
  GraphQLJSON,
  'SegmentColumn',
  "One column setting of a segment's list view.",
);
