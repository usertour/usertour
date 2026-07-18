import { createdAtWhere, nameContains } from '@/common/filters';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { UpdateContentInput } from './dto/content-update.input';
import { ContentInput, ContentVersionInput } from './dto/content.input';
import { VersionUpdateInput } from './dto/version-update.input';
import { VersionUpdateLocalizationInput } from './dto/version.input';
import { WebSocketGateway } from '@/web-socket/web-socket.gateway';
import { WebSocketV2Gateway } from '@/web-socket/v2/web-socket-v2.gateway';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Prisma } from '@prisma/client';
import {
  ContentPublishedDeleteError,
  EnvironmentProjectMismatchError,
  ParamsError,
  UnknownError,
  VersionConflictError,
  VersionNotEditableError,
} from '@/common/errors';
import { ContentConfigObject, ContentDataType } from '@usertour/types';
import {
  duplicateConfig,
  duplicateData,
  duplicateStep,
  remapFlowTranslationIdentifiers,
  remapVersionDataTranslationIdentifiers,
} from '@usertour/helpers';
import { ProjectCacheService } from '@/shared/project-cache.service';

/**
 * Who performed a version / publish write. Web passes the session user; the
 * API/MCP surfaces pass the key: `userId` = the key's OWNER (used for the
 * version rows' created/updatedBy attribution) and `tokenId` = the key itself
 * (publish records store either-or, mirroring AuditLog, so an automation's
 * action is never disguised as a hand-made one).
 */
export type WriteActor = { userId?: string | null; tokenId?: string | null };

/**
 * Actor columns for a ContentPublishRecord — store BOTH when both are known.
 * OAuth access-token rows are short-lived and hard-deleted by the hourly expiry
 * cleanup, so a token-only record would lose its attribution within the hour;
 * with actorUserId alongside, the owner's name survives (the record just loses
 * the token's pretty name, which is the designed degradation).
 */
const publishActorFields = (actor?: WriteActor) => ({
  ...(actor?.tokenId ? { actorTokenId: actor.tokenId } : {}),
  ...(actor?.userId ? { actorUserId: actor.userId } : {}),
});

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    private webSocketGateway: WebSocketGateway,
    private webSocketV2Gateway: WebSocketV2Gateway,
    private readonly cache: ProjectCacheService,
  ) {}

  async createContent(input: ContentInput) {
    const { steps = [], name, buildUrl, environmentId, config, data, themeId, type } = input;

    try {
      const environment = await this.prisma.environment.findUnique({
        where: { id: environmentId },
      });
      if (!environment) {
        throw new ParamsError();
      }

      return await this.prisma.$transaction(async (tx) => {
        const content = await tx.content.create({
          data: {
            name,
            buildUrl,
            type,
            environmentId,
            projectId: environment.projectId,
          },
        });
        const version = await tx.version.create({
          data: {
            sequence: 0,
            contentId: content.id,
            config,
            data,
            themeId,
            steps: { create: [...steps] },
          } as any,
        });
        await tx.content.update({
          where: { id: content.id },
          data: { editedVersionId: version.id } as any,
        });
        return await tx.content.findUnique({ where: { id: content.id } });
      });
    } catch (_) {
      throw new UnknownError();
    }
  }

  async updateContent(contentId: string, data: UpdateContentInput) {
    // A Content can be published into multiple environments via
    // ContentOnEnvironment, so invalidating just `Content.environmentId`
    // (the legacy primary field) leaves stale cache in every other env.
    // The versionFull cache no longer embeds mutable Content fields
    // (findVersions re-attaches Content from this slice on read), so a
    // rename only needs to clear the env+type slices.
    const envIds = await this.collectContentEnvIds(contentId);
    const updated = await this.prisma.content.update({
      where: { id: contentId },
      data: { ...data } as any,
    });
    if (envIds.length > 0) {
      await this.cache.invalidate(envIds.flatMap((envId) => this.cache.envContentKeys(envId)));
    }
    return updated;
  }

  async getContentByStepId(stepId: string) {
    return await this.prisma.step
      .findUnique({ where: { id: stepId } })
      .version()
      .content();
  }

  async getContentById(contentId: string) {
    return await this.getContent(contentId);
  }

  async createContentVersion(input: ContentVersionInput, actor?: WriteActor) {
    const { versionId, config } = input;

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Fetch source version with related content and its edited version in one query
        const sourceVersion = await tx.version.findUnique({
          where: { id: versionId },
          include: {
            steps: true,
            content: {
              include: { editedVersion: true },
            },
          },
        });

        if (!sourceVersion?.content?.editedVersion) {
          throw new ParamsError();
        }

        const contentId = sourceVersion.content.id;

        // Serialize concurrent forks on this Content row. Two autosaves (data +
        // config) editing a live version each fork independently; without this
        // lock they race — both compute the same sequence and one INSERT hits
        // @@unique([contentId, sequence]), so that save errors and its edit is
        // lost. Mirrors assertVersionEditableLocked used by updateContentVersion.
        await tx.$queryRaw`SELECT id FROM "Content" WHERE id = ${contentId} FOR UPDATE`;

        // Re-read the edit version under the lock. If a concurrent fork already
        // turned it into an unpublished draft, reuse it instead of forking
        // again — the other autosave's write then lands on the same draft and
        // both edits survive.
        const content = await tx.content.findUnique({
          where: { id: contentId },
          include: { editedVersion: true, contentOnEnvironments: true },
        });
        const editedVersion = content?.editedVersion;
        if (!editedVersion) {
          throw new ParamsError();
        }
        const editedVersionPublished = content.contentOnEnvironments?.some(
          (env) => env.published && env.publishedVersionId === editedVersion.id,
        );
        if (!editedVersionPublished) {
          // A concurrent save already forked this into an unpublished draft.
          // Honor the same contract the fork branch does — the returned draft
          // carries THIS caller's config, with regenerated condition ids — by
          // applying it here. A data save passes no config and must leave the
          // draft's targeting untouched.
          if (config) {
            return await tx.version.update({
              where: { id: editedVersion.id },
              data: { config: duplicateConfig(config as ContentConfigObject) },
            });
          }
          return editedVersion;
        }

        // Prepare steps by removing database-specific fields
        const steps = sourceVersion.steps.map(
          ({ id, createdAt, updatedAt, versionId, ...step }) => step,
        );

        // Create new version with regenerated config IDs
        const newConfig = duplicateConfig((config ?? editedVersion.config) as ContentConfigObject);

        const version = await tx.version.create({
          data: {
            sequence: editedVersion.sequence + 1,
            config: newConfig,
            data: editedVersion.data,
            themeId: editedVersion.themeId,
            // Carry the publish schedule across the fork. Announcement
            // visibility is gated on publishedVersion.scheduledAt, so dropping
            // it here would silently turn a future-scheduled announcement into
            // an immediately-visible one once the forked draft is republished.
            scheduledAt: editedVersion.scheduledAt,
            contentId,
            createdByUserId: actor?.userId ?? null,
            updatedByUserId: actor?.userId ?? null,
            steps: { create: steps },
          } as any,
        });

        await this.copyVersionLocalizations(tx, sourceVersion.id, version.id);

        // Update content to point to the new edited version
        await tx.content.update({
          where: { id: contentId },
          data: { editedVersionId: version.id } as any,
        });

        return version;
      });
    } catch (error) {
      if (error instanceof ParamsError) {
        throw error;
      }
      throw new UnknownError();
    }
  }

  async getContentVersionById(versionId: string) {
    return await this.prisma.version.findUnique({
      where: { id: versionId },
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });
  }

  async updateContentVersion(input: VersionUpdateInput, actor?: WriteActor) {
    const { versionId, content, expectedUpdatedAt } = input;
    const { steps, ...bareFields } = content;
    // Stamp who wrote the version row alongside the write itself.
    const versionFields = actor?.userId
      ? { ...bareFields, updatedByUserId: actor.userId }
      : bareFields;

    // Contract: when steps are sent (the builder's whole-version save) each one
    // must carry a front-end cvid — it's the upsert key. Cheap to validate
    // before opening the transaction.
    if (steps?.some((step) => !step.cvid)) {
      throw new ParamsError();
    }

    return await this.prisma.$transaction(async (tx) => {
      // Editability guard, atomic with the write. Row-locks the Content row so a
      // concurrent publish / restore — both mutate that same row — is serialized
      // against this write; we then read their committed editedVersionId /
      // per-environment published state rather than a pre-write snapshot. The
      // version-row optimistic lock below only guards the row's own updatedAt,
      // never this relational state, so the pre-transaction
      // contentVersionIsEditable() was a TOCTOU: a publish/restore landing
      // between check and write slipped through and wrote a published or
      // already-forked version.
      await this.assertVersionEditableLocked(tx, versionId);

      // Write the version's scalar fields (themeId / config / data / scheduledAt).
      // Optimistic lock is opt-in per call: the builder's whole-version save sends
      // the updatedAt it last baselined from, enforced atomically as a conditional
      // write — a 0-row match means someone saved meanwhile, so throw instead of
      // blind-overwriting their work. detail's scalar updates omit it (field-level
      // last-write-wins is acceptable there).
      if (expectedUpdatedAt) {
        const writeResult = await tx.version.updateMany({
          where: { id: versionId, updatedAt: expectedUpdatedAt },
          data: versionFields,
        });
        if (writeResult.count === 0) {
          throw new VersionConflictError();
        }
      } else {
        await tx.version.update({ where: { id: versionId }, data: versionFields });
      }

      // No steps in the payload → scalar-only update (detail's path). Still
      // return steps via include: the shared document requests `steps`, so
      // omitting them makes Apollo normalize Version.steps to null and wipe the
      // step list from the cache.
      if (!steps) {
        return await tx.version.findUnique({
          where: { id: versionId },
          include: { steps: { orderBy: { sequence: 'asc' } } },
        });
      }

      // Whole-version save: upsert the entire step list by cvid so create /
      // update / delete / reorder all ride this one call; return the full
      // version so the client re-baselines from the response (no follow-up fetch).
      const existing = await tx.step.findMany({ where: { versionId } });
      const incomingCvids = new Set(steps.map((step) => step.cvid));

      // Delete steps dropped from the list.
      const deleteIds = existing
        .filter((step) => !incomingCvids.has(step.cvid))
        .map((step) => step.id);
      if (deleteIds.length > 0) {
        await tx.step.deleteMany({ where: { id: { in: deleteIds } } });
      }

      // sequence is unique per version (@@unique([versionId, sequence])), so
      // park surviving rows out of range before reassigning — otherwise an
      // in-loop sequence write collides with a not-yet-moved row.
      for (const step of existing) {
        if (incomingCvids.has(step.cvid)) {
          await tx.step.update({
            where: { versionId_cvid: { versionId, cvid: step.cvid } },
            data: { sequence: { increment: 10000 } },
          });
        }
      }

      // Upsert by cvid: matching cvid → update; new cvid → create with the
      // front-end cvid + a server-generated primary id. Final sequence = index.
      for (let index = 0; index < steps.length; index++) {
        const { id, cvid, ...rest } = steps[index];
        await tx.step.upsert({
          where: { versionId_cvid: { versionId, cvid: cvid as string } },
          create: { ...rest, cvid, versionId, sequence: index },
          update: { ...rest, sequence: index },
        });
      }

      return await tx.version.findUnique({
        where: { id: versionId },
        include: { steps: { orderBy: { sequence: 'asc' } } },
      });
    });
  }

  /**
   * Publish history for one content — newest first, enriched with display names
   * (actor user / key, environment). Names resolve at read time so records
   * survive user/token/environment deletion (they just lose the pretty name).
   */
  async listContentPublishRecords(
    contentId: string,
    pagination: { first?: number; last?: number; before?: string; after?: string },
    environmentId?: string,
  ) {
    const where = { contentId, ...(environmentId ? { environmentId } : {}) };
    const connection = await findManyCursorConnection(
      (args) =>
        this.prisma.contentPublishRecord.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          ...args,
        }),
      () => this.prisma.contentPublishRecord.count({ where }),
      pagination,
    );

    const nodes = connection.edges.map((e) => e.node);
    const userIds = [...new Set(nodes.map((n) => n.actorUserId).filter(Boolean))] as string[];
    const tokenIds = [...new Set(nodes.map((n) => n.actorTokenId).filter(Boolean))] as string[];
    const envIds = [...new Set(nodes.map((n) => n.environmentId))];
    // An empty `in: []` list returns [] — no need to special-case.
    const [users, tokens, envs] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      }),
      this.prisma.apiToken.findMany({
        where: { id: { in: tokenIds } },
        select: { id: true, name: true, user: { select: { name: true } } },
      }),
      this.prisma.environment.findMany({
        where: { id: { in: envIds } },
        select: { id: true, name: true },
      }),
    ]);
    const userName = new Map(users.map((u) => [u.id, u.name]));
    const tokenById = new Map(tokens.map((t) => [t.id, t]));
    const envName = new Map(envs.map((e) => [e.id, e.name]));

    for (const edge of connection.edges) {
      const n = edge.node as (typeof nodes)[number] & {
        actorName?: string | null;
        actorTokenName?: string | null;
        environmentName?: string | null;
      };
      const token = n.actorTokenId ? tokenById.get(n.actorTokenId) : undefined;
      n.actorName = n.actorUserId
        ? (userName.get(n.actorUserId) ?? null)
        : (token?.user?.name ?? null);
      n.actorTokenName = token?.name ?? null;
      n.environmentName = envName.get(n.environmentId) ?? null;
    }
    return connection;
  }

  async listContentVersions(
    contentId: string,
    pagination: { first?: number; last?: number; before?: string; after?: string },
  ) {
    const where = { contentId };
    return await findManyCursorConnection(
      (args) =>
        this.prisma.version.findMany({
          where,
          orderBy: { sequence: 'desc' },
          ...args,
        }),
      () => this.prisma.version.count({ where }),
      pagination,
    );
  }

  /**
   * Publish/unpublish take a client-supplied environmentId, but the caller is
   * only authorized against the CONTENT's project (PermissionGuard's Content
   * scope derives the project from the version/content, never from the env).
   * Without this guard a member of project A could publish their content into
   * project B's environment — the SDK runtime serves published content purely
   * by ContentOnEnvironment.environmentId, so that is cross-tenant content
   * injection. The v2 REST/MCP wrapper checks this too; enforcing it in the
   * domain method is the single point every caller (web GraphQL included)
   * funnels through.
   */
  private async requireEnvironmentInContentProject(
    environmentId: string,
    contentId: string,
  ): Promise<void> {
    const [content, environment] = await Promise.all([
      this.prisma.content.findUnique({
        where: { id: contentId },
        select: { projectId: true },
      }),
      this.prisma.environment.findUnique({
        where: { id: environmentId },
        select: { projectId: true, deleted: true },
      }),
    ]);
    if (
      !content ||
      !environment ||
      environment.deleted ||
      environment.projectId !== content.projectId
    ) {
      throw new EnvironmentProjectMismatchError();
    }
  }

  async publishedContentVersion(versionId: string, environmentId: string, actor?: WriteActor) {
    const version = await this.getContentVersionById(versionId);
    await this.requireEnvironmentInContentProject(environmentId, version.contentId);
    const now = new Date();

    const { content, supersededVersionId } = await this.prisma.$transaction(async (tx) => {
      // Update Content table
      const content = await tx.content.update({
        where: { id: version.contentId },
        data: {
          published: true,
          publishedVersionId: version.id,
          publishedAt: now,
        },
      });

      // The announcement feed orders and groups strictly by scheduledAt (the
      // author-facing "Announcement time"). When it's left as "Immediately",
      // stamp the first publish time so every published announcement has a
      // stable, non-null ordering key. Only fill when empty: publishing a
      // second environment — or an edit that forks and carries scheduledAt
      // forward — keeps the original first-publish time, and an author-set
      // (future) time is left untouched. The emptiness check lives in the
      // WHERE (not an `if` on the version snapshot read before this
      // transaction): a concurrent saveVersionScheduledAt could set a future
      // time after that read, and a snapshot-based stamp would silently
      // overwrite it with `now` — publishing next week's announcement to
      // everyone immediately.
      if (content.type === ContentDataType.ANNOUNCEMENT) {
        await tx.version.updateMany({
          where: { id: version.id, scheduledAt: null },
          data: { scheduledAt: now },
        });
      }

      // Capture the version this publish SUPERSEDES (if any) before the
      // upsert overwrites it — its versionFull cache entry must be wiped, see
      // below.
      const priorCoe = await tx.contentOnEnvironment.findUnique({
        where: {
          environmentId_contentId: { environmentId, contentId: content.id },
        },
        select: { publishedVersionId: true },
      });

      // Update or create ContentOnEnvironment
      await tx.contentOnEnvironment.upsert({
        where: {
          environmentId_contentId: {
            environmentId: environmentId,
            contentId: content.id,
          },
        },
        create: {
          environmentId: environmentId,
          contentId: content.id,
          published: true,
          publishedAt: now,
          publishedVersionId: version.id,
        },
        update: {
          published: true,
          publishedAt: now,
          publishedVersionId: version.id,
        },
      });

      // Publish history: product data, written in the SAME transaction as the
      // publish (unlike the audit log's async side-channel).
      await tx.contentPublishRecord.create({
        data: {
          contentId: content.id,
          versionId: version.id,
          versionSequence: version.sequence,
          environmentId,
          action: 'publish',
          ...publishActorFields(actor),
        },
      });

      return { content, supersededVersionId: priorCoe?.publishedVersionId ?? null };
    });

    // versionFull caches Version + Steps on the assumption that a published
    // version is immutable (see unpublishedContentVersion, which wipes it on
    // detach). A publish breaks that invariant in two directions and must wipe
    // BOTH: the SUPERSEDED version detaches and becomes editable again (its
    // cached entry would go stale on the next edit), and the version being
    // published may itself have been published→superseded→edited before — a
    // poisoned entry from its first live period would serve the pre-edit
    // snapshot to new users for up to the 30-min TTL (RC tier-C, defect 1).
    const keys = [
      ...this.cache.envContentKeys(environmentId),
      this.cache.keys.publishedVersionId(environmentId, content.id),
      this.cache.keys.versionFull(version.id),
    ];
    if (supersededVersionId && supersededVersionId !== version.id) {
      keys.push(this.cache.keys.versionFull(supersededVersionId));
    }
    await this.cache.invalidate(keys);

    return content;
  }

  async unpublishedContentVersion(contentId: string, environmentId: string, actor?: WriteActor) {
    await this.requireEnvironmentInContentProject(environmentId, contentId);
    const result = await this.prisma.$transaction(async (tx) => {
      // Update Content table
      const content = await tx.content.update({
        where: { id: contentId },
        data: {
          published: false,
          publishedVersionId: null,
        },
      });

      // Check if ContentOnEnvironment record exists before deleting
      const contentOnEnv = await tx.contentOnEnvironment.findUnique({
        where: {
          environmentId_contentId: {
            environmentId: environmentId,
            contentId: content.id,
          },
        },
      });

      if (contentOnEnv) {
        await tx.contentOnEnvironment.delete({
          where: {
            environmentId_contentId: {
              environmentId: environmentId,
              contentId: content.id,
            },
          },
        });
        const unpublished = await tx.version.findUnique({
          where: { id: contentOnEnv.publishedVersionId },
          select: { sequence: true },
        });
        await tx.contentPublishRecord.create({
          data: {
            contentId: content.id,
            versionId: contentOnEnv.publishedVersionId,
            versionSequence: unpublished?.sequence ?? 0,
            environmentId,
            action: 'unpublish',
            ...publishActorFields(actor),
          },
        });
      }

      return { content, unpublishedVersionId: contentOnEnv?.publishedVersionId ?? null };
    });

    const keys = [
      ...this.cache.envContentKeys(environmentId),
      this.cache.keys.publishedVersionId(environmentId, contentId),
    ];
    // versionFull caches Version + Steps with a 30-min TTL on the assumption
    // that a published version is immutable. Unpublishing breaks that
    // invariant — once detached from every COE the version drops back into
    // editable state, and any subsequent step / version edits would render
    // a still-cached entry stale. Wipe it here so the next read repopulates
    // from DB.
    if (result.unpublishedVersionId) {
      keys.push(this.cache.keys.versionFull(result.unpublishedVersionId));
    }
    await this.cache.invalidate(keys);

    // Cancel all active content sessions for this content
    await this.webSocketV2Gateway.cancelAllContentSessions(contentId, environmentId);

    return result.content;
  }

  async deleteContent(contentId: string) {
    // Refuse to delete content that is still live in any environment — deleting
    // it would pull a published experience out from under users. The web UI
    // disables delete while published; enforce the same rule here so every
    // caller (GraphQL, v2 REST, MCP) is bound by it, not just the UI. Unpublish
    // from all environments first, then delete.
    const publishedCount = await this.prisma.contentOnEnvironment.count({
      where: { contentId, published: true },
    });
    if (publishedCount > 0) {
      throw new ContentPublishedDeleteError();
    }
    // Same multi-environment caveat as updateContent: a Content can have
    // ContentOnEnvironment rows in several envs, and each env has its
    // own cached slice + pubver mapping that must be invalidated.
    const envIds = await this.collectContentEnvIds(contentId);
    const updated = await this.prisma.$transaction(async (tx) => {
      // Drop per-env publication along with the soft-delete. Otherwise
      // findPublishedVersionId (which only checks ContentOnEnvironment.
      // published, not Content.deleted) would re-resolve a versionId for
      // the deleted content the next time the cache repopulates.
      await tx.contentOnEnvironment.deleteMany({ where: { contentId } });
      return await tx.content.update({
        where: { id: contentId },
        data: { deleted: true },
      });
    });
    const keys = envIds.flatMap((envId) => [
      ...this.cache.envContentKeys(envId),
      this.cache.keys.publishedVersionId(envId, contentId),
    ]);
    if (keys.length > 0) {
      await this.cache.invalidate(keys);
    }
    // Mirror unpublishedContentVersion: cancel active sessions per env,
    // not just the legacy primary one.
    await Promise.all(
      envIds.map((envId) => this.webSocketV2Gateway.cancelAllContentSessions(contentId, envId)),
    );
    return updated;
  }

  /**
   * Reverse deleteContent's soft-delete. deleteContent refuses while published
   * and drops every ContentOnEnvironment row, so a deleted content holds no
   * publish state — restoring reintroduces none and has no caches to
   * invalidate. The content returns as an unpublished draft (versions, steps
   * and publish history were never touched).
   */
  async restoreContent(contentId: string) {
    return await this.prisma.content.update({
      where: { id: contentId },
      data: { deleted: false },
    });
  }

  /**
   * All env ids that have this content cached. Pulls every COE row plus
   * the legacy `Content.environmentId` (some old rows may have a primary
   * env without a matching COE entry — defend in depth).
   */
  private async collectContentEnvIds(contentId: string): Promise<string[]> {
    const [coes, content] = await Promise.all([
      this.prisma.contentOnEnvironment.findMany({
        where: { contentId },
        select: { environmentId: true },
      }),
      this.prisma.content.findUnique({
        where: { id: contentId },
        select: { environmentId: true },
      }),
    ]);
    const envIds = new Set<string>();
    for (const coe of coes) {
      envIds.add(coe.environmentId);
    }
    if (content?.environmentId) {
      envIds.add(content.environmentId);
    }
    return [...envIds];
  }

  async duplicateContent(contentId: string, name: string) {
    const duplicateContent = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: { environment: true },
    });
    if (!duplicateContent || duplicateContent.deleted) {
      throw new ParamsError();
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const editedVersion = await tx.version.findUnique({
          where: { id: duplicateContent.editedVersionId },
          include: { steps: true },
        });

        const content = await tx.content.create({
          data: {
            name: name || duplicateContent.name,
            buildUrl: duplicateContent.buildUrl,
            // Homing follows the source — the legacy column is inert (nothing
            // user-visible reads WHICH env it names), so there is no target choice.
            environmentId: duplicateContent.environmentId,
            type: duplicateContent.type,
            projectId: duplicateContent.projectId,
          },
        });

        const steps = editedVersion.steps.map((step) => duplicateStep(step));
        const newConfig = duplicateConfig(editedVersion.config as ContentConfigObject);
        const processedData = duplicateData(editedVersion.data, duplicateContent.type);

        const version = await tx.version.create({
          data: {
            sequence: 0,
            contentId: content.id,
            config: newConfig,
            data: processedData as Prisma.JsonValue,
            themeId: editedVersion.themeId,
            steps: { create: [...steps] },
          },
        });

        // Translations copy over like fork/restore do, but duplicating
        // regenerates question cvids and checklist item ids (the copy must
        // not share analytics identities), so localized/backup get the new
        // identifiers written in by position first.
        const remapTranslationPayload = (payload: unknown): unknown => {
          if (duplicateContent.type === ContentDataType.FLOW) {
            return remapFlowTranslationIdentifiers(steps, payload);
          }
          return remapVersionDataTranslationIdentifiers(
            duplicateContent.type,
            processedData,
            payload,
          );
        };
        const versionLocalizations = await tx.versionOnLocalization.findMany({
          where: { versionId: editedVersion.id },
        });
        if (versionLocalizations.length > 0) {
          await tx.versionOnLocalization.createMany({
            data: versionLocalizations.map((versionLocalization) => ({
              versionId: version.id,
              localizationId: versionLocalization.localizationId,
              enabled: versionLocalization.enabled,
              localized: remapTranslationPayload(
                versionLocalization.localized,
              ) as Prisma.InputJsonValue,
              backup: remapTranslationPayload(versionLocalization.backup) as Prisma.InputJsonValue,
            })),
          });
        }

        await tx.content.update({
          where: { id: content.id },
          data: { editedVersionId: version.id },
        });
        return content;
      });
    } catch (_) {
      throw new UnknownError();
    }
  }

  async restoreContentVersion(versionId: string, actor?: WriteActor) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const restoreVersion = await tx.version.findUnique({
          where: {
            id: versionId,
          },
          include: { steps: true },
        });
        const editedVersion = await tx.content
          .findUnique({
            where: { id: restoreVersion.contentId },
          })
          .editedVersion();
        const contentId = restoreVersion.contentId;
        const oldSteps = restoreVersion.steps.map(
          ({ id, createdAt, updatedAt, versionId, ...step }) => {
            return step;
          },
        );

        const version = await tx.version.create({
          data: {
            sequence: editedVersion.sequence + 1,
            contentId: restoreVersion.contentId,
            createdByUserId: actor?.userId ?? null,
            updatedByUserId: actor?.userId ?? null,
            config: restoreVersion.config,
            data: restoreVersion.data,
            themeId: restoreVersion.themeId,
            steps: { create: [...oldSteps] },
          } as any,
        });
        await this.copyVersionLocalizations(tx, restoreVersion.id, version.id);
        await tx.content.update({
          where: { id: contentId },
          data: { editedVersionId: version.id },
        });
        return version;
      });
    } catch (_) {
      throw new UnknownError();
    }
  }

  async getEnvironment(id: string) {
    return await this.prisma.environment.findUnique({ where: { id } });
  }

  async getContent(id: string) {
    return await this.prisma.content.findUnique({
      where: { id, deleted: false },
      include: {
        publishedVersion: true,
        contentOnEnvironments: { include: { environment: true, publishedVersion: true } },
      },
    });
  }

  async getContentVersion(id: string) {
    return await this.prisma.version.findUnique({
      where: { id, deleted: false },
      include: { content: true },
    });
  }

  async contentVersionIsEditable(versionId: string) {
    const version = await this.prisma.version.findUnique({
      where: { id: versionId, deleted: false },
    });
    if (!version) {
      throw new ParamsError();
    }
    const contentItem = await this.prisma.content.findUnique({
      where: { id: version.contentId, deleted: false },
      include: { contentOnEnvironments: true },
    });
    if (!contentItem) {
      // Version exists but its content is soft-deleted — operating on the
      // version is not allowed. Without this guard, the access on
      // `contentItem.editedVersionId` below threw a TypeError that escaped
      // the resolver as a generic 500.
      throw new ParamsError();
    }

    const isPublished = contentItem.contentOnEnvironments?.find(
      (env) => env.published && env.publishedVersionId === versionId,
    );

    // Not the content's edited version (someone forked a newer one) or
    // already live in an environment — either way writes are refused with a
    // dedicated code so clients can tell "stale editor" apart from bad input.
    if (contentItem.editedVersionId !== versionId || isPublished) {
      throw new VersionNotEditableError();
    }

    return true;
  }

  // Transaction-scoped twin of contentVersionIsEditable(): same "is this version
  // still the content's edit version, and not published?" check, but it takes a
  // FOR UPDATE row lock on the Content row first. publishedContentVersion and
  // restoreContentVersion both mutate that same Content row inside their own
  // transactions, so the lock serializes a concurrent save against them — once we
  // hold it, the editedVersionId / contentOnEnvironments we read are their
  // committed state, not a stale pre-write snapshot. Use this (not the unlocked
  // check) for any write that must not land on a published or forked version.
  private async assertVersionEditableLocked(tx: Prisma.TransactionClient, versionId: string) {
    const version = await tx.version.findUnique({ where: { id: versionId, deleted: false } });
    if (!version) {
      throw new ParamsError();
    }
    // The serialization point: FOR UPDATE blocks until any in-flight
    // publish/restore on this Content row commits (or makes them block on us).
    await tx.$queryRaw`SELECT id FROM "Content" WHERE id = ${version.contentId} FOR UPDATE`;
    const contentItem = await tx.content.findUnique({
      where: { id: version.contentId, deleted: false },
      include: { contentOnEnvironments: true },
    });
    if (!contentItem) {
      throw new ParamsError();
    }
    const isPublished = contentItem.contentOnEnvironments?.some(
      (env) => env.published && env.publishedVersionId === versionId,
    );
    if (contentItem.editedVersionId !== versionId || isPublished) {
      throw new VersionNotEditableError();
    }
  }

  async listVersionLocalizations(versionId: string) {
    // Pure read: locales without a row are simply untranslated — the web
    // client renders them from listLocalizations and the row appears on the
    // first upsert.
    return await this.prisma.versionOnLocalization.findMany({
      where: { versionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async upsertVersionLocalization(input: VersionUpdateLocalizationInput) {
    const { versionId, localizationId, localized, backup, enabled } = input;
    if (!(await this.contentVersionIsEditable(versionId))) {
      throw new ParamsError();
    }
    // localized/backup are optional: undefined is skipped by the update
    // clause, so a state-only write (the enable toggle) can never clobber
    // a translation saved from elsewhere.
    return await this.prisma.$transaction(async (tx) => {
      const row = await tx.versionOnLocalization.upsert({
        where: { versionId_localizationId: { versionId, localizationId } },
        create: {
          versionId,
          localizationId,
          localized: localized ?? {},
          backup: backup ?? {},
          enabled,
        },
        update: { localized: localized ?? undefined, backup: backup ?? undefined, enabled },
      });
      // Translations belong to the draft, so saving one counts as saving the
      // draft: touch the version's updatedAt and hand the version back — the
      // client's normalized cache then moves the header's "Autosaved"
      // timestamp without a refetch. Only editable drafts reach this point
      // (gate above), so no delivered version is ever touched.
      const version = await tx.version.update({
        where: { id: versionId },
        data: { updatedAt: new Date() },
      });
      return { ...row, version };
    });
  }

  /**
   * Translations are keyed by step cvid, which step copies carry verbatim, so
   * a forked or restored version can reuse the source version's rows as-is.
   */
  private async copyVersionLocalizations(
    tx: Prisma.TransactionClient,
    fromVersionId: string,
    toVersionId: string,
  ) {
    const versionLocalizations = await tx.versionOnLocalization.findMany({
      where: { versionId: fromVersionId },
    });
    if (versionLocalizations.length === 0) {
      return;
    }
    await tx.versionOnLocalization.createMany({
      data: versionLocalizations.map((versionLocalization) => ({
        versionId: toVersionId,
        localizationId: versionLocalization.localizationId,
        enabled: versionLocalization.enabled,
        localized: versionLocalization.localized as Prisma.InputJsonValue,
        backup: versionLocalization.backup as Prisma.InputJsonValue,
      })),
    });
  }

  async getContentWithRelations(
    id: string,
    projectId: string,
    include?: {
      editedVersion?: boolean;
      publishedVersion?: boolean;
    },
  ) {
    return await this.prisma.content.findFirst({
      where: {
        id,
        projectId,
      },
      include: {
        editedVersion: include?.editedVersion ?? false,
        publishedVersion: include?.publishedVersion ?? false,
      },
    });
  }

  /**
   * Like {@link getContentWithRelations} but with a caller-provided Prisma
   * include — lets the v2 API load per-environment publish rows
   * (`contentOnEnvironments`) that the v1 flag-based variant can't express.
   */
  async findContentWithRelations(id: string, projectId: string, include: Prisma.ContentInclude) {
    return await this.prisma.content.findFirst({ where: { id, projectId }, include });
  }

  async getContentVersionWithRelations(
    versionId: string,
    projectId: string,
    include?: Prisma.VersionInclude,
  ) {
    return await this.prisma.version.findFirst({
      where: {
        id: versionId,
        content: {
          projectId,
        },
      },
      include: {
        content: include?.content,
        steps: include?.steps ? { orderBy: { sequence: 'asc' } } : false,
      },
    });
  }

  async listContentVersionsWithRelations(
    projectId: string,
    contentId: string,
    paginationArgs: {
      first?: number;
      last?: number;
      after?: string;
      before?: string;
    },
    include?: Prisma.VersionInclude,
    orderBy?: Prisma.VersionOrderByWithRelationInput[],
  ) {
    const baseQuery = {
      where: {
        contentId,
        content: {
          projectId,
        },
      },
      include: {
        content: include?.content,
        steps: include?.steps ? { orderBy: { sequence: 'asc' as const } } : false,
      },
      orderBy,
    };

    return await findManyCursorConnection(
      (args) => this.prisma.version.findMany({ ...baseQuery, ...args }),
      () => this.prisma.version.count({ where: baseQuery.where }),
      paginationArgs,
    );
  }

  async listContentWithRelations(
    projectId: string,
    paginationArgs: {
      first?: number;
      last?: number;
      after?: string;
      before?: string;
    },
    include?: Prisma.ContentInclude,
    orderBy?: Prisma.ContentOrderByWithRelationInput[],
    type?: string,
    published?: boolean,
    createdAfter?: string,
    createdBefore?: string,
    name?: string,
    deleted = false,
  ) {
    const nameFilter = nameContains(name);
    const baseQuery = {
      // Soft-deleted content is excluded by default — the public-API list (v1 +
      // v2) must never surface archived content unless the caller explicitly
      // asks for the recovery pool (v2 `?deleted=true`, for restore).
      where: {
        projectId,
        deleted,
        ...(type ? { type } : {}),
        ...(nameFilter ? { name: nameFilter } : {}),
        ...createdAtWhere(createdAfter, createdBefore),
        // "published" is per-environment — ContentOnEnvironment is the source of
        // truth, NOT the legacy Content.published column.
        ...(published !== undefined
          ? {
              contentOnEnvironments: published
                ? { some: { published: true } }
                : { none: { published: true } },
            }
          : {}),
      },
      include,
      orderBy,
    };

    return await findManyCursorConnection(
      (args) => this.prisma.content.findMany({ ...baseQuery, ...args }),
      () => this.prisma.content.count({ where: { ...baseQuery.where } }),
      paginationArgs,
    );
  }
}
