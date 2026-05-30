import { TypePolicy } from '@/apollo/type-policies';

import { InMemoryCache } from '@apollo/client';

// Plain in-memory cache. No `apollo3-cache-persist` here: admin
// workspaces are multi-member, and stale cross-session cache surfaced
// as team members not seeing each other's edits — same staleness
// concern that already vetoed `cache-first` for the per-query
// fetchPolicy (see `apps/web/src/apollo/options.ts`). The previous
// persist setup also silently rebuilt a "complete" list view on
// reload, masking pagination / merge bugs (e.g. the
// `listContentVersions` accumulator loop). One cold network round
// per tab open is the correct trade-off for an admin tool.
async function initCache(): Promise<InMemoryCache> {
  return new InMemoryCache({
    addTypename: true,
    typePolicies: TypePolicy,
  });
}
export default initCache;
