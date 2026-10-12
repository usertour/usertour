import { GraphQLJSONObject } from 'graphql-type-json';

import { namedScalar } from '@/modules/common/utils/named-scalar.util';

export const SessionStateScalar = namedScalar(
  GraphQLJSONObject,
  'SessionState',
  "A session's state object, shaped per content type (a checklist's item states, for one).",
);
