import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request mutable state used to defer cross-cutting concerns
 * (currently: cache invalidation) until the request boundary, so they
 * fire AFTER any embedded $transaction has committed.
 *
 * The "request" here is whatever scope the entry-point wraps in
 * `requestContext.run(...)`: typically a websocket message handler call
 * or an admin mutation. Service methods inside that scope read the store
 * via `requestContext.getStore()` and append work to be drained at exit.
 */
export interface RequestContext {
  /** Cache keys to invalidate after the current request scope completes. */
  deferredCacheInvalidations: Set<string>;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function createRequestContext(): RequestContext {
  return { deferredCacheInvalidations: new Set<string>() };
}
