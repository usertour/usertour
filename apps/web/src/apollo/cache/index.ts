import { TypePolicy } from '@/apollo/type-policies';
import { persistCache } from 'apollo3-cache-persist';

import { InMemoryCache } from '@apollo/client';

async function initCache(): Promise<InMemoryCache> {
  const cache: InMemoryCache = new InMemoryCache({
    addTypename: false,
    typePolicies: TypePolicy,
  });

  await persistCache({
    cache,
    storage: window.localStorage,
    debug: import.meta.env.MODE === 'development',
  });

  return cache;
}
export default initCache;
