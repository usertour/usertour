import { AsyncLocalStorage } from 'node:async_hooks';
import type { BizUser } from '@prisma/client';

/**
 * Per-request mutable state used to defer cross-cutting concerns
 * (currently: cache invalidation, BizUser lookup memo) until the request
 * boundary, so deferred invalidations fire AFTER any embedded $transaction
 * has committed and per-request memos are released cleanly.
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
   * BizUser lookup memo keyed by `${envId}:${externalUserId}`. Stores the
   * in-flight Promise (not the resolved value) so concurrent loaders coalesce
   * into a single DB query. Holds whatever the first caller fetched: callers
   * that need stricter freshness (e.g. tx-bound reads after a write) must
   * bypass the memo and query directly.
   */
  bizUserMemo: Map<string, Promise<BizUser | null>>;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function createRequestContext(): RequestContext {
  return {
    deferredCacheInvalidations: new Set<string>(),
    bizUserMemo: new Map(),
  };
}
