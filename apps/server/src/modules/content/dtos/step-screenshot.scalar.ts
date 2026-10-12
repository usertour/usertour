import GraphQLJSON from 'graphql-type-json';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

export const StepScreenshotScalar = namedScalar(
  GraphQLJSON,
  'StepScreenshot',
  "A step's screenshot object.",
);
