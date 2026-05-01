import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request mutable state used to defer cross-cutting concerns
 * (cache invalidation, lookup memos) until the request boundary, so
 * deferred invalidations fire AFTER any embedded $transaction has
 * committed and per-request memos are released cleanly.
 *
 * The "request" here is whatever scope the entry-point wraps in
 * `requestContext.run(...)`: typically a websocket message handler call
 * or an admin mutation. Service methods inside that scope read the store
 * via `requestContext.getStore()` and append work to be drained at exit.
 */
export interface RequestContext {
  /** Cache keys to invalidate after the current request scope completes. */
  deferredCacheInvalidations: Set<string>;
  /**
   * Coalesces same-scope repeated lookups into one DB query. Keys are
   * `${namespace}:${callerKey}` to keep distinct entity types from
   * colliding when callers happen to share an identifier shape. Stores
   * in-flight Promises so concurrent loaders share the same query.
   *
   * Holds whatever the first caller fetched: paths that need stricter
   * freshness (e.g. tx-bound reads after a write) must bypass the memo
   * and query directly.
   */
  memo: Map<string, Promise<unknown>>;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function createRequestContext(): RequestContext {
  return {
    deferredCacheInvalidations: new Set<string>(),
    memo: new Map(),
  };
}
