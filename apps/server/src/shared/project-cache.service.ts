import { Injectable, Logger } from '@nestjs/common';
import { ContentDataType } from '@usertour/types';
import { RedisService } from './redis.service';
import { createRequestContext, requestContext } from './request-context';

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
   * Cache key builders. All keys are prefixed by their scope (project / env / etc.)
   * so an `invalidateProject(id)` style sweep can be implemented without scanning.
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
    /** Single Segment definition by id. */
    segment: (segmentId: string) => `segment:${segmentId}`,
    /** Map a (env, content) → publishedVersionId so the join doesn't re-run. */
    publishedVersionId: (envId: string, contentId: string) =>
      `env:${envId}:content:${contentId}:pubver`,
    /** Project + Subscription bundle used by the license check. */
    projectLicense: (projectId: string) => `proj:${projectId}:license`,
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
   * If no request scope is active we fall back to immediate invalidation.
   * That's correct for callers that aren't inside a transaction (their
   * Prisma writes auto-commit per statement).
   */
  invalidateDeferred(keys: string | string[]): void {
    const ctx = requestContext.getStore();
    if (!ctx) {
      void this.invalidate(keys);
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
