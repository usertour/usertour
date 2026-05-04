import { Injectable, Logger } from '@nestjs/common';
import { ContentDataType } from '@usertour/types';
import { RedisService } from './redis.service';
import { createRequestContext, requestContext } from './request-context';

const MEMO_VALUE = Symbol('memoSetValue');
type MemoizedPromise<T> = Promise<T> & { [MEMO_VALUE]?: T };

/**
 * Centralized cache for project-scoped configuration data that the SDK
 * websocket message handlers read on every toggleContents iteration but
 * which only changes when an admin updates the configuration. The single
 * source of truth for cache key naming + TTL lives here so read sites and
 * write-side invalidation never drift apart.
 *
 * Multi-instance safe: backed only by Redis, no in-process memory layer.
 * Adding a memory layer would require Redis pub/sub for cross-Pod
 * invalidation; the latency win is not worth the complexity until measured.
 *
 * Values must JSON round-trip cleanly. Prisma entities with Date columns
 * will lose their `Date` type — callers should either project the entity
 * down to a primitive shape or revive Date fields explicitly on read.
 *
 * --- Invalidation model ---
 *
 * Writes call `invalidateDeferred(key)` which buffers the invalidation in
 * the current request's AsyncLocalStorage context (set up by `runInScope`
 * at message handler entry). Buffered invalidations fire the next time
 * the cache is READ via `get` in the same scope, or when the scope
 * ends — whichever comes first. This guarantees:
 *   - same-request reads after a write see the new state
 *   - concurrent cross-request reads can't repopulate cache from
 *     pre-commit DB state, because the write tx has always committed
 *     by the time the deferred invalidation fires
 *
 * --- IMPORTANT constraint ---
 *
 * Do NOT call `get` from inside an open `prisma.$transaction(callback)`
 * block. The pre-read flush would invalidate cache while the surrounding tx
 * has not yet committed, allowing a concurrent reader to query the DB
 * (READ COMMITTED hides the in-flight tx) and repopulate the cache with
 * stale data. The deferred-write protection assumes reads happen AFTER any
 * write tx that touched the same key has committed.
 *
 * Today no caller violates this — `get` is only invoked from the
 * EndBatch / toggleContents path which runs auto-commit Prisma calls, not
 * inside a wrapping $transaction. New cache call sites should preserve
 * this invariant or pre-fetch the cached values before opening the tx.
 */
@Injectable()
export class ProjectCacheService {
  private readonly logger = new Logger(ProjectCacheService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Redis cache key builders. All keys are prefixed by their scope
   * (project / env / etc.) so an `invalidateProject(id)` style sweep can be
   * implemented without scanning. Consumed by `get` / `mget` / `invalidate`.
   */
  readonly keys = {
    /** All project-level Attribute definitions for content evaluation. */
    attrs: (projectId: string) => `proj:${projectId}:attrs`,
    /** All Themes for a project. */
    themes: (projectId: string) => `proj:${projectId}:themes`,
    /** Published Content rows for an environment, sliced by content type. */
    contents: (envId: string, type: string) => `env:${envId}:contents:${type}`,
    /** Full Version row including steps for a specific version id. */
    versionFull: (versionId: string) => `version:${versionId}:full`,
    /** Map a (env, content) → publishedVersionId so the join doesn't re-run. */
    publishedVersionId: (envId: string, contentId: string) =>
      `env:${envId}:content:${contentId}:pubver`,
    /** Project + Subscription bundle used by the license check. */
    projectLicense: (projectId: string) => `proj:${projectId}:license`,
  };

  /**
   * Per-request memo key builders. Consumed by `memoize`. Each entry's
   * leading segment doubles as the namespace, so distinct entity types
   * can never collide in `RequestContext.memo`. Centralized so callers
   * across files share a single source of truth — e.g. `hasBizEvent` is
   * issued from both `ContentDataService` and `ConditionEvaluationService`,
   * and both must produce the same key for the memo to coalesce them.
   *
   * Array inputs are sorted before joining so the same set in different
   * orders hits the same memo entry.
   */
  readonly memoKeys = {
    bizUser: (envId: string, externalUserId: string) => `bizUser:${envId}:${externalUserId}`,
    bizCompany: (envId: string, externalCompanyId: string) =>
      `bizCompany:${envId}:${externalCompanyId}`,
    bizUserOnCompany: (bizUserId: string, bizCompanyId: string) =>
      `bizUserOnCompany:${bizUserId}:${bizCompanyId}`,
    bizUserOnCompanyWithBizCompany: (bizUserId: string, envId: string, externalCompanyId: string) =>
      `bizUserOnCompanyWithBizCompany:${bizUserId}:${envId}:${externalCompanyId}`,
    projectConfig: (projectId: string) => `projectConfig:${projectId}`,
    /**
     * Snapshot of the Redis-backed SocketData for a connected client.
     * Unlike the other memo keys this entry IS mutated mid-scope (session
     * lifecycle writes), so SocketDataService.set/delete must call
     * `invalidateMemo` after every Redis write.
     */
    socketData: (socketId: string) => `socketData:${socketId}`,
    /** Single Segment row by id; the same segment is referenced by many
     * conditions in one EndBatch evaluation. */
    segment: (segmentId: string) => `segment:${segmentId}`,
    /** MANUAL-segment membership lookup for a given user. */
    bizUserOnSegment: (segmentId: string, bizUserId: string) =>
      `bizUserOnSegment:${segmentId}:${bizUserId}`,
    /** MANUAL-segment membership lookup for a given company. */
    bizCompanyOnSegment: (segmentId: string, bizCompanyId: string) =>
      `bizCompanyOnSegment:${segmentId}:${bizCompanyId}`,
    /**
     * Pre-fetched union of session/event data for all contentIds visible
     * in a toggleContents pass. Populated once at scope entry; per-type
     * findSessions calls peek this and return a contentId-subset view.
     */
    toggleSessions: (bizUserId: string) => `toggleSessions:${bizUserId}`,
  };

  /**
   * Read-through cache. Returns the cached value when present, otherwise
   * runs the loader and writes the result back with the given TTL.
   *
   * Drains any pending `invalidateDeferred` calls from the current request
   * scope BEFORE reading. Without this, a single message handler that
   * (a) creates a new entity, (b) defers invalidation, then (c) reads the
   * cached set in the same scope (e.g. trackEvent → toggleContents) would
   * see its own pre-invalidation snapshot.
   *
   * Negative results (loader returning null/undefined) are NOT cached —
   * we don't want to lock in a "not found" answer for 5 minutes if the
   * row was just about to be created.
   */
  async get<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    await this.flushDeferred();

    const cached = await this.redis.getJson<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await loader();
    if (fresh !== undefined && fresh !== null) {
      try {
        await this.redis.setJsonEx(key, fresh, ttlSeconds);
      } catch (err) {
        // Cache write failure must not break the read path.
        this.logger.warn(`Failed to write cache for ${key}: ${err}`);
      }
    }
    return fresh;
  }

  async invalidate(keys: string | string[]): Promise<void> {
    try {
      await this.redis.del(keys);
    } catch (err) {
      // Invalidation failure is bad but not fatal — TTL will eventually
      // expire the stale entry. Log so it shows up in monitoring.
      this.logger.error(`Failed to invalidate cache keys ${JSON.stringify(keys)}: ${err}`);
    }
  }

  /**
   * Defer cache invalidation until the current request scope ends.
   *
   * Called from inside domain methods that may run within a $transaction —
   * invalidating mid-tx would race with concurrent reads still seeing the
   * pre-commit DB state. By deferring to the request boundary we guarantee
   * the invalidation fires after every embedded $transaction has committed.
   *
   * If no request scope is active we fall back to immediate invalidation
   * and `await` the underlying Redis DEL so callers that wish to gate
   * their response on cache consistency (e.g. an admin GraphQL mutation
   * that returns before the next SDK read) can `await` this call.
   * In-scope callers can still ignore the returned Promise — the buffer
   * write is synchronous and the returned Promise resolves immediately.
   */
  async invalidateDeferred(keys: string | string[]): Promise<void> {
    const ctx = requestContext.getStore();
    if (!ctx) {
      await this.invalidate(keys);
      return;
    }
    const list = Array.isArray(keys) ? keys : [keys];
    for (const key of list) {
      ctx.deferredCacheInvalidations.add(key);
    }
  }

  /**
   * Batch variant of `get`: read N keys with one MGET, batch-load the
   * misses via the caller-provided loader (typically a single `findMany`),
   * then write the freshly-loaded entries back with one pipelined MSETEX.
   *
   * Returns a Map keyed by the input cache key. Order of `keys` is preserved
   * via the returned Map insertion order, but callers should look up by key
   * rather than relying on iteration order.
   */
  async mget<T>(
    keys: string[],
    ttlSeconds: number,
    loadMissing: (missingKeys: string[]) => Promise<Map<string, T>>,
  ): Promise<Map<string, T>> {
    await this.flushDeferred();

    const result = new Map<string, T>();
    if (keys.length === 0) {
      return result;
    }

    const cached = await this.redis.mgetJson<T>(keys);
    const missingKeys: string[] = [];
    for (let i = 0; i < keys.length; i++) {
      const v = cached[i];
      if (v !== null) {
        result.set(keys[i], v);
      } else {
        missingKeys.push(keys[i]);
      }
    }

    if (missingKeys.length > 0) {
      const fresh = await loadMissing(missingKeys);
      const toCache: Array<[string, T]> = [];
      for (const [key, value] of fresh) {
        result.set(key, value);
        toCache.push([key, value]);
      }
      if (toCache.length > 0) {
        try {
          await this.redis.setJsonExMany(toCache, ttlSeconds);
        } catch (err) {
          this.logger.warn(`Failed to write ${toCache.length} cache entries: ${err}`);
        }
      }
    }

    return result;
  }

  /**
   * Establish a request scope around `fn`. Any `invalidateDeferred` calls
   * inside the scope are buffered and fired the next time the cache is
   * read (via `get`) or once `fn` resolves — whichever comes first.
   *
   * Use this at outer boundaries that own a transaction lifecycle but aren't
   * already running inside another scope (admin mutations, etc.). Websocket
   * message handlers wrap dispatch with this same primitive.
   */
  async runInScope<T>(fn: () => Promise<T>): Promise<T> {
    const ctx = createRequestContext();
    try {
      return await requestContext.run(ctx, fn);
    } finally {
      // Tail flush: covers requests that mutate but never read.
      if (ctx.deferredCacheInvalidations.size > 0) {
        await this.invalidate([...ctx.deferredCacheInvalidations]);
      }
    }
  }

  /**
   * Per-request lookup memo. Coalesces same-scope repeated reads (the 6-type
   * toggleContents loop, findThemes, session-builder, segment evaluation
   * all hitting the same BizUser / BizCompany / config) down to one DB hit
   * per `key`. Lifetime is bound to the current `runInScope` boundary;
   * outside a scope it falls through to the loader.
   *
   * Stores the in-flight Promise so concurrent callers don't race two
   * queries before the first one resolves.
   *
   * Always pass keys built via `memoKeys.*` so distinct entity types stay
   * partitioned and cross-file callers (e.g. the two `hasBizEvent` sites)
   * coalesce into one memo entry.
   *
   * Caveat: holds whatever entity the first caller resolved. Mid-scope
   * writes (e.g. `updateUserSeenAttributes` bumping lastSeenAt) are not
   * reflected in subsequent memo reads — that matches the desired
   * "scope-entry snapshot" semantics for evaluation. Paths that need
   * freshness across an in-scope write must bypass this method.
   */
  async memoize<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const ctx = requestContext.getStore();
    if (!ctx) {
      return loader();
    }
    const existing = ctx.memo.get(key);
    if (existing) {
      return existing as Promise<T>;
    }
    const promise = loader();
    ctx.memo.set(key, promise);
    return promise;
  }

  /**
   * Drop a per-request memo entry so the next `memoize` for the same key
   * re-runs its loader. Reserved for state that legitimately mutates inside
   * a scope (e.g. SocketData session lifecycle writes). For snapshot-style
   * entities like BizUser this is a code smell — refactor the writer to
   * keep the snapshot consistent instead.
   *
   * No-op when called outside a request scope.
   */
  invalidateMemo(key: string): void {
    const ctx = requestContext.getStore();
    if (!ctx) {
      return;
    }
    ctx.memo.delete(key);
  }

  /**
   * Pre-populate a per-request memo entry with an already-computed value.
   * Useful for "fan-out collapse" patterns where the caller resolved the
   * full result by union once and wants subsequent narrower lookups to
   * read a subset of that value instead of re-querying.
   *
   * Stores the value both as a resolved Promise (for `memoize` callers
   * that `await` it) and as a synchronous side-channel (for `peekMemo`
   * callers that need to branch without awaiting).
   *
   * No-op when called outside a request scope.
   */
  memoSet<T>(key: string, value: T): void {
    const ctx = requestContext.getStore();
    if (!ctx) {
      return;
    }
    const wrapped = Promise.resolve(value) as MemoizedPromise<T>;
    wrapped[MEMO_VALUE] = value;
    ctx.memo.set(key, wrapped);
  }

  /**
   * Synchronous peek into a memo entry seeded via `memoSet`. Returns
   * undefined for both "no entry" and "entry seeded asynchronously by
   * `memoize`" — async-loaded promises don't expose their resolved value
   * synchronously, so peekMemo cannot read them. Callers that need an
   * async-loaded value should `await memoize(...)` instead.
   *
   * Returns undefined outside a request scope.
   */
  peekMemo<T>(key: string): T | undefined {
    const ctx = requestContext.getStore();
    if (!ctx) {
      return undefined;
    }
    const entry = ctx.memo.get(key) as MemoizedPromise<T> | undefined;
    return entry?.[MEMO_VALUE];
  }

  /**
   * Drain any pending `invalidateDeferred` calls in the current request
   * scope. Called automatically by `get` before each cache read.
   * Safe to call when no scope is active (no-op).
   */
  private async flushDeferred(): Promise<void> {
    const ctx = requestContext.getStore();
    if (!ctx || ctx.deferredCacheInvalidations.size === 0) {
      return;
    }
    const keys = [...ctx.deferredCacheInvalidations];
    ctx.deferredCacheInvalidations.clear();
    await this.invalidate(keys);
  }

  /** One-shot wipe of every project-scoped key for a given project. */
  async invalidateProject(projectId: string): Promise<void> {
    await this.invalidate([
      this.keys.attrs(projectId),
      this.keys.themes(projectId),
      this.keys.projectLicense(projectId),
    ]);
  }

  /**
   * Cache keys covering every content-type slice for an environment.
   * Admin write paths usually don't know which slices changed —
   * `await cache.invalidate(cache.envContentKeys(envId))` wipes them all
   * with a single Redis DEL.
   */
  envContentKeys(envId: string): string[] {
    return Object.values(ContentDataType).map((type) => this.keys.contents(envId, type));
  }
}
