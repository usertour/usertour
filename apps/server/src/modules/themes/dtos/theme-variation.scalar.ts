import GraphQLJSON from 'graphql-type-json';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

export const ThemeVariationScalar = namedScalar(
  GraphQLJSON,
  'ThemeVariation',
  'One conditional variation of a theme: its conditions and settings overrides.',
);
