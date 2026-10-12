import GraphQLJSON from 'graphql-type-json';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

export const ThemeSettingsScalar = namedScalar(
  GraphQLJSON,
  'ThemeSettings',
  "A theme's settings object: the per-surface styling the builder edits.",
);
