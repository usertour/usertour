import { TypePolicy } from '@/apollo/type-policies';
import { persistCache } from 'apollo3-cache-persist';

import { InMemoryCache } from '@apollo/client';

// Bumped from the unset default (`apollo-cache-persist`) when ADR 0006
// flipped addTypename: true. Old persisted snapshots are missing the
// __typename fields the new cache expects to read back, so we ignore
// them and let the next set of queries repopulate.
const CACHE_PERSIST_KEY = 'apollo-cache-persist-v2';

async function initCache(): Promise<InMemoryCache> {
  const cache: InMemoryCache = new InMemoryCache({
    addTypename: true,
    typePolicies: TypePolicy,
  });

  await persistCache({
    cache,
    storage: window.localStorage,
    key: CACHE_PERSIST_KEY,
    debug: import.meta.env.MODE === 'development',
  });

  return cache;
}
export default initCache;
