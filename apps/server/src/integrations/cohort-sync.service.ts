import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Integration, Prisma } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from 'nestjs-prisma';
import { BizService } from '@/biz/biz.service';
import { IntegrationNotFoundError, ValidationError } from '@/common/errors';
import { resolveOrigin } from '@/common/http/resolve-origin';
import { EncryptionService } from '@/shared/encryption.service';
import { CohortSyncBatch, CohortSyncResult } from './cohort-sync.types';
import { buildInboundUrl, generateInboundToken, hashInboundToken } from './inbound-token';

/**
 * The provider-agnostic cohort-sync engine (ADR 0012): one provider cohort ↔
 * one MANUAL segment PER PROJECT, members as plain BizUserOnSegment rows.
 * Entry adapters hand it normalized CohortSyncBatch values; nothing in here
 * knows a provider's wire shape.
 *
 * Convergence: segments are project-scoped, so every environment's
 * integration syncing the same cohort feeds the SAME segment through its own
 * mapping row. Each mapping only ever touches members its environment
 * bridged — bridging resolves against the integration's environment, and the
 * replace cleanup is bounded to it — so environments never reap each other.
 *
 * Idempotency: adds are createMany+skipDuplicates (the (segmentId, bizUserId)
 * unique makes retries no-ops), removes tolerate absent rows. Full-roster
 * rounds implement REPLACE via a round stamp: every page touches its members'
 * updatedAt, and the final page deletes rows untouched since the round began.
 * Out-of-order pages self-heal (a late page re-adds; a post-cleanup retry is
 * a plain add).
 */
@Injectable()
export class CohortSyncService {
  private readonly logger = new Logger(CohortSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bizService: BizService,
    private readonly encryption: EncryptionService,
    private readonly configService: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // Engine
  // ---------------------------------------------------------------------------

  async processBatch(batch: CohortSyncBatch): Promise<CohortSyncResult> {
    const integration = await this.prisma.integration.findUnique({
      where: { id: batch.integrationId },
      select: { id: true, provider: true, environment: { select: { id: true, projectId: true } } },
    });
    if (!integration?.environment) {
      throw new IntegrationNotFoundError();
    }

    const mapping = await this.findOrCreateMapping(
      integration.id,
      integration.provider,
      integration.environment.projectId,
      batch.source.cohortId,
      batch.source.cohortName,
    );

    // Identity bridge: external ids -> BizUsers of THIS environment. Members
    // not seen before are CREATED as bare users (externalId only, ADR §4) —
    // the point of a cohort is reaching users before they first appear
    // in-product. A remove only resolves: deleting an absent member is a
    // no-op, not a reason to mint a user.
    let bizUsers: { id: string }[] = [];
    if (batch.memberExternalIds.length) {
      bizUsers =
        batch.action === 'remove'
          ? await this.prisma.bizUser.findMany({
              where: {
                environmentId: integration.environment.id,
                externalId: { in: batch.memberExternalIds },
              },
              select: { id: true },
            })
          : await this.bizService.findOrCreateBizUsersByExternalIds(
              integration.environment.id,
              batch.memberExternalIds,
            );
    }
    // Only parse-level failures remain unresolved: members whose wire object
    // carried no extractable user id (typically a userIdProperty that is not
    // exported). Everything with an id either exists or was just created.
    const unresolved = batch.unresolvedCount;
    const bizUserIds = bizUsers.map((bizUser) => bizUser.id);

    const now = new Date();
    if (batch.action === 'remove') {
      if (bizUserIds.length > 0) {
        await this.prisma.bizUserOnSegment.deleteMany({
          where: { segmentId: mapping.segmentId, bizUserId: { in: bizUserIds } },
        });
      }
    } else {
      // 'add' and 'replace' pages both upsert. The updatedAt touch is what
      // lets a replace round's final page distinguish still-present members
      // from stale ones (skipDuplicates leaves existing rows untouched).
      let roundStartedAt: Date | null = null;
      if (batch.action === 'replace' && batch.round) {
        roundStartedAt = await this.beginOrContinueRound(mapping.id, batch.round.sessionId, now);
      }
      if (bizUserIds.length > 0) {
        await this.prisma.bizUserOnSegment.createMany({
          data: bizUserIds.map((bizUserId) => ({ segmentId: mapping.segmentId, bizUserId })),
          skipDuplicates: true,
        });
        await this.prisma.bizUserOnSegment.updateMany({
          where: { segmentId: mapping.segmentId, bizUserId: { in: bizUserIds } },
          data: { updatedAt: now },
        });
      }
      if (
        batch.action === 'replace' &&
        batch.round &&
        batch.round.page >= batch.round.totalPages &&
        roundStartedAt
      ) {
        // Final page: everyone the round never touched left the cohort —
        // bounded to THIS environment's members, since other environments'
        // integrations feed the same segment on their own schedules.
        await this.prisma.bizUserOnSegment.deleteMany({
          where: {
            segmentId: mapping.segmentId,
            updatedAt: { lt: roundStartedAt },
            bizUser: { environmentId: integration.environment.id },
          },
        });
        // Completion keeps the session id and clears only the stamp: a
        // provider RETRY of this final page (timeout after our commit) must
        // read as "already completed" — treating it as a fresh round would
        // re-run the cleanup against a new stamp and reap every member the
        // other pages contributed.
        await this.prisma.integrationSyncedSegment.update({
          where: { id: mapping.id },
          data: { fullSyncStartedAt: null },
        });
      }
    }

    // The mapping's contribution, not the segment total: each environment's
    // dashboard reports what ITS bridge matched.
    const memberCount = await this.prisma.bizUserOnSegment.count({
      where: {
        segmentId: mapping.segmentId,
        bizUser: { environmentId: integration.environment.id },
      },
    });
    await this.prisma.integrationSyncedSegment.update({
      where: { id: mapping.id },
      data: {
        lastSyncedAt: now,
        memberCount,
        // The LAST batch's count, not a lifetime tally: the dashboard shows
        // it as current state, and a fixed misconfiguration must read as 0.
        unresolvedCount: unresolved,
        // The segment's name follows provider-side renames.
        ...(mapping.sourceCohortName !== batch.source.cohortName
          ? { sourceCohortName: batch.source.cohortName }
          : {}),
      },
    });
    if (mapping.sourceCohortName !== batch.source.cohortName) {
      await this.prisma.segment.update({
        where: { id: mapping.segmentId },
        data: { name: batch.source.cohortName },
      });
    }

    return { matched: bizUserIds.length, unresolved };
  }

  /**
   * The mapping row for (integration, cohort), creating it on first contact.
   * The cohort's segment converges project-wide: another environment's
   * integration may already have materialized it — reuse that segment rather
   * than minting a sibling. Concurrency-safe on both uniques: a lost create
   * race falls back to re-reading the winner's row
   * (docs/conventions/concurrent-state-writes.md).
   */
  private async findOrCreateMapping(
    integrationId: string,
    provider: string,
    projectId: string,
    cohortId: string,
    cohortName: string,
  ) {
    const existing = await this.prisma.integrationSyncedSegment.findUnique({
      where: {
        integrationId_sourceCohortId: { integrationId, sourceCohortId: cohortId },
      },
    });
    if (existing) {
      return existing;
    }

    const segment =
      (await this.prisma.segment.findFirst({
        where: { projectId, source: provider, sourceId: cohortId },
      })) ?? (await this.createSegmentForCohort(projectId, provider, cohortId, cohortName));
    try {
      return await this.prisma.integrationSyncedSegment.create({
        data: {
          integrationId,
          sourceCohortId: cohortId,
          sourceCohortName: cohortName,
          segmentId: segment.id,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        // A concurrent first page of THIS integration won the mapping race —
        // use its row. The segment is shared project-wide, never delete it.
        return await this.prisma.integrationSyncedSegment.findUniqueOrThrow({
          where: {
            integrationId_sourceCohortId: { integrationId, sourceCohortId: cohortId },
          },
        });
      }
      throw error;
    }
  }

  /**
   * Create the cohort's segment. The (projectId, source, sourceId) unique
   * makes cross-environment first syncs race-safe: the loser adopts the
   * winner's segment instead of leaving a duplicate behind.
   */
  private async createSegmentForCohort(
    projectId: string,
    provider: string,
    cohortId: string,
    cohortName: string,
  ) {
    try {
      return await this.bizService.createUserSegmentWithSource(
        projectId,
        cohortName,
        provider,
        cohortId,
      );
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        const winner = await this.prisma.segment.findFirst({
          where: { projectId, source: provider, sourceId: cohortId },
        });
        if (winner) {
          return winner;
        }
      }
      throw error;
    }
  }

  /**
   * Full-roster round bookkeeping. A new session id stamps the round start;
   * later pages of the same session reuse it so the final page's cleanup
   * line is the ROUND's start, not its own. A session that already COMPLETED
   * (id retained, stamp cleared) returns null: its retried pages apply as
   * plain adds and never re-run the cleanup.
   */
  private async beginOrContinueRound(
    mappingId: string,
    sessionId: string,
    now: Date,
  ): Promise<Date | null> {
    // Conditional claim first: only a row NOT already on this session takes
    // the new stamp, so concurrent first pages agree on a single round start
    // instead of each overwriting it with their own clock. The null branch is
    // spelled out — `NOT: { field: value }` never matches NULL rows.
    await this.prisma.integrationSyncedSegment.updateMany({
      where: {
        id: mappingId,
        OR: [{ fullSyncSessionId: null }, { NOT: { fullSyncSessionId: sessionId } }],
      },
      data: { fullSyncSessionId: sessionId, fullSyncStartedAt: now },
    });
    const mapping = await this.prisma.integrationSyncedSegment.findUniqueOrThrow({
      where: { id: mappingId },
      select: { fullSyncSessionId: true, fullSyncStartedAt: true },
    });
    // Stamp already cleared for this session = the round completed; null
    // tells the caller to skip the final-page cleanup on a retry.
    if (mapping.fullSyncSessionId === sessionId) {
      return mapping.fullSyncStartedAt;
    }
    // A different session claimed the row between our write and read —
    // treat this page as not being part of an active round.
    return null;
  }

  // ---------------------------------------------------------------------------
  // Management (dashboard surface)
  // ---------------------------------------------------------------------------

  /**
   * The decrypted receive URL for a row that has minted a token, else null.
   * The origin prefers the configured API_URL and falls back to the calling
   * request's host (resolveOrigin) — a default install with API_URL unset
   * must still hand out an absolute, copyable URL.
   */
  inboundUrlFor(
    integration: Pick<Integration, 'provider' | 'inboundToken'>,
    request?: Request,
  ): string | null {
    if (!integration.inboundToken) {
      return null;
    }
    const token = this.encryption.decrypt(integration.inboundToken);
    if (!token) {
      // Undecryptable (rotated encryption key): surface as absent — the fix
      // is flipping the switch off/on or rotating, both of which re-mint.
      return null;
    }
    return buildInboundUrl(resolveOrigin(this.configService, request), integration.provider, token);
  }

  /**
   * Update the inbound side: the switch and/or the identity-bridge override.
   * First enable mints the receive token. An empty-string userIdProperty
   * clears the override (back to distinct_id).
   */
  async updateInbound(
    integration: Integration,
    changes: { enabled?: boolean; userIdProperty?: string },
  ): Promise<Integration> {
    // Mint when enabling with no token — or with one this deployment can no
    // longer decrypt (rotated encryption key): the off/on flip is the
    // documented recovery path, so it must actually re-mint.
    const mintToken =
      changes.enabled === true &&
      (!integration.inboundToken || !this.encryption.decrypt(integration.inboundToken));
    const token = mintToken ? generateInboundToken() : null;

    const config = { ...((integration.inboundConfig as Record<string, unknown>) ?? {}) };
    if (changes.userIdProperty !== undefined) {
      const trimmed = changes.userIdProperty.trim();
      if (trimmed) {
        config.userIdProperty = trimmed;
      } else {
        // An undefined value drops the key when Prisma JSON-stringifies the column.
        config.userIdProperty = undefined;
      }
    }

    return await this.prisma.integration.update({
      where: { id: integration.id },
      data: {
        ...(changes.enabled !== undefined ? { inboundEnabled: changes.enabled } : {}),
        ...(changes.userIdProperty !== undefined
          ? { inboundConfig: config as Prisma.InputJsonValue }
          : {}),
        ...(token
          ? {
              inboundToken: this.encryption.encrypt(token) as string,
              inboundTokenHash: hashInboundToken(token),
            }
          : {}),
      },
    });
  }

  /** Replace the receive token; the old URL 404s immediately. */
  async rotateInboundToken(integration: Integration): Promise<Integration> {
    if (!integration.inboundToken) {
      throw new ValidationError('Enable cohort sync first — there is no token to rotate.');
    }
    const token = generateInboundToken();
    return await this.prisma.integration.update({
      where: { id: integration.id },
      data: {
        inboundToken: this.encryption.encrypt(token) as string,
        inboundTokenHash: hashInboundToken(token),
      },
    });
  }

  /** The integration's synced cohorts with their segment names, newest first. */
  async listSyncedSegments(integrationId: string) {
    return await this.prisma.integrationSyncedSegment.findMany({
      where: { integrationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { segment: { select: { name: true } } },
    });
  }

  /**
   * Release this integration's mappings (ADR 0012 §6). A segment converges
   * project-wide, so it only returns to ordinary life when the LAST mapping
   * feeding it goes — while a sibling environment still syncs the cohort,
   * the segment stays synced. Must run before the integration row can be
   * deleted — the FK is RESTRICT on purpose.
   */
  async releaseAllForIntegration(integrationId: string): Promise<void> {
    const mappings = await this.prisma.integrationSyncedSegment.findMany({
      where: { integrationId },
      select: { id: true, segmentId: true },
    });
    for (const mapping of mappings) {
      await this.prisma.$transaction(async (tx) => {
        await releaseSyncedSegmentMapping(tx, mapping);
      });
    }
  }
}

/**
 * Drop one mapping and, when it was the LAST one feeding its segment, return
 * the segment to ordinary life. Shared by integration deletion (above) and
 * environment deletion (environments.service) — the caller owns the
 * transaction so the release commits atomically with whatever removed the
 * integration's reachability.
 */
export const releaseSyncedSegmentMapping = async (
  tx: Prisma.TransactionClient,
  mapping: { id: string; segmentId: string },
): Promise<void> => {
  await tx.integrationSyncedSegment.delete({ where: { id: mapping.id } });
  const remaining = await tx.integrationSyncedSegment.count({
    where: { segmentId: mapping.segmentId },
  });
  if (remaining === 0) {
    await tx.segment.updateMany({
      where: { id: mapping.segmentId },
      data: { source: 'internal', sourceId: null },
    });
  }
};
