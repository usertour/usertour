import GraphQLJSON from 'graphql-type-json';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

export const StepSettingsScalar = namedScalar(
  GraphQLJSON,
  'StepSettings',
  "A step's layout settings: size, placement, backdrop and completion flags.",
);
