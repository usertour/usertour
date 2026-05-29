import { ApolloLink } from '@apollo/client';
import { removeTypenameFromVariables } from '@apollo/client/link/remove-typename';
import { errorLink } from './errors';
import { serverLink } from './server';

// With `addTypename: true` on the cache (ADR 0006), every cached
// `@ObjectType` carries a `__typename` field. Any mutation that takes
// a cached entity and spreads it back into variables (e.g. the builder
// reading a Step out of cache, tweaking it, and posting it to
// `updateContentStep($data: UpdateStepInput!)`) ships that `__typename`
// to the server — and GraphQL input types reject unknown fields, so
// the request 400s with `Field "__typename" is not defined by type
// "UpdateStepInput"`. Strip `__typename` from outgoing variables
// uniformly here rather than threading the concern through every call
// site. JSON-scalar payloads (Step.data, Segment.data, etc.) are
// untouched because Apollo never injects `__typename` into opaque
// scalars in the first place.
const removeTypenameLink = removeTypenameFromVariables();

const link: ApolloLink = ApolloLink.from([errorLink, removeTypenameLink, serverLink]);

export default link;
