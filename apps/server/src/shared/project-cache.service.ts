import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

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
   * Negative results (loader returning null/undefined) are NOT cached —
   * we don't want to lock in a "not found" answer for 5 minutes if the
   * row was just about to be created.
   */
  async getOrFetch<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.redis.getJson<T>(key);
    if (cached !== null) return cached;

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

  /** One-shot wipe of every project-scoped key for a given project. */
  async invalidateProject(projectId: string): Promise<void> {
    await this.invalidate([
      this.keys.attrs(projectId),
      this.keys.themes(projectId),
      this.keys.projectLicense(projectId),
    ]);
  }
}
