import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { OutboundMessageStatus, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from 'nestjs-prisma';
import { QUEUE_CLEAN_OUTBOUND_MESSAGES } from '@/common/consts/queen';

/** How long messages (and their attempts) are kept before the daily cleanup drops them. */
export const OUTBOUND_MESSAGE_RETENTION_DAYS = 30;
/** Stored excerpt limits — the ledger is a debugging aid, not an archive. */
export const OUTBOUND_ERROR_MAX_LENGTH = 500;
export const OUTBOUND_RESPONSE_BODY_MAX_LENGTH = 1_000;
/** Brief retries before a settle write is swallowed (see the class doc). */
const RECORD_ATTEMPT_WRITE_RETRIES = 2;

/** Exactly one destination: a webhook endpoint or an integration provider. */
export type OutboundDestination = { webhookId: string } | { integrationId: string };

export interface OutboundMessageInput {
  /** Public message id, chosen by the producer (webhook payload `id`). */
  id: string;
  environmentId: string;
  destination: OutboundDestination;
  topic: string;
  payload: Prisma.InputJsonValue;
}

export interface OutboundAttemptResult {
  attempt: number;
  success: boolean;
  responseStatus?: number | null;
  responseBody?: string | null;
  error?: string | null;
  durationMs?: number | null;
  /** True when this attempt exhausts the retry budget — a failure then marks the message FAILED. */
  final: boolean;
}

/**
 * The outbound delivery ledger (ADR 0010 §10): one OutboundMessage per
 * (destination × message) holding the payload as sent, plus one
 * OutboundDelivery per attempt. Shared by webhooks and integrations — the
 * transports differ, the bookkeeping doesn't. Producers write the message row
 * BEFORE enqueueing (the record exists even if the queue never runs it);
 * processors record every attempt; the dashboard reads messages with their
 * attempts and can re-send from the stored payload.
 *
 * Ledger writes are observability, not delivery: `recordAttempt` swallows its
 * own failures so a logging problem can never FAIL a delivery (a throw here
 * would make BullMQ retry an attempt that already reached the receiver). The
 * swallow is not free on the success path — a lost DELIVERED settle leaves
 * the message PENDING for the reconcile sweep to re-deliver (at-least-once
 * legal, but gratuitous) — so the write retries briefly before giving up.
 */
@Injectable()
export class OutboundLedgerService implements OnModuleInit {
  private readonly logger = new Logger(OutboundLedgerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_CLEAN_OUTBOUND_MESSAGES) private readonly cleanupQueue: Queue,
  ) {}

  // Schedule the recurring retention cleanup. Mirrors the auth/subscription
  // cron pattern (BullMQ repeatable + fixed jobId so it fires once per
  // cluster); scheduling failure must not block app boot.
  async onModuleInit() {
    try {
      await this.setupCleanupJob();
    } catch (error) {
      this.logger.error(`Failed to schedule outbound message cleanup job: ${error}`);
    }
  }

  private async setupCleanupJob() {
    const existingJobs = await this.cleanupQueue.getJobSchedulers();
    await Promise.all(existingJobs.map((job) => this.cleanupQueue.removeJobScheduler(job.id)));

    await this.cleanupQueue.add(
      'clean-outbound-messages',
      {},
      {
        repeat: { pattern: '30 3 * * *' }, // daily at 03:30
        jobId: 'clean-outbound-messages', // fixed id dedupes across instances
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
  }

  /**
   * Persist message rows (status PENDING). Call before enqueueing their jobs;
   * enqueue only for the RETURNED ids. Batch-first (one INSERT); if that
   * single statement fails — typically an FK violation because a destination
   * row was deleted between the caller's read and this write — degrade to
   * per-row inserts so one vanished destination cannot erase the whole
   * batch's record of intent. Rows that still fail individually are logged
   * and dropped: their destination is gone, there is nothing to deliver to.
   */
  async createMessages(inputs: OutboundMessageInput[]): Promise<string[]> {
    if (inputs.length === 0) {
      return [];
    }
    const rows = inputs.map((input) => ({
      id: input.id,
      environmentId: input.environmentId,
      topic: input.topic,
      payload: input.payload,
      ...('webhookId' in input.destination
        ? { webhookId: input.destination.webhookId }
        : { integrationId: input.destination.integrationId }),
    }));
    try {
      await this.prisma.outboundMessage.createMany({ data: rows });
      return rows.map((row) => row.id);
    } catch (batchError) {
      this.logger.warn(
        `Batch insert of ${rows.length} outbound messages failed (${batchError}); retrying per row`,
      );
      const persisted: string[] = [];
      for (const row of rows) {
        try {
          await this.prisma.outboundMessage.create({ data: row });
          persisted.push(row.id);
        } catch (rowError) {
          this.logger.warn(
            `Dropping outbound message ${row.id} for a vanished destination: ${rowError}`,
          );
        }
      }
      return persisted;
    }
  }

  /**
   * Bump a PENDING message's last-activity stamp without recording an
   * attempt — the cooldown defer path calls this so a job parked (repeatedly)
   * behind a breaker window stays visible to the reconcile sweep as alive.
   * Guarded on PENDING and never throws: pure bookkeeping.
   */
  async touch(id: string): Promise<void> {
    try {
      await this.prisma.outboundMessage.updateMany({
        where: { id, status: OutboundMessageStatus.PENDING },
        data: { updatedAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`Failed to touch outbound message ${id}`, error as Error);
    }
  }

  /**
   * Append an attempt row and advance the message status: DELIVERED on
   * success, FAILED when a failure exhausts the retry budget, otherwise the
   * message stays PENDING for the next try. The message row is touched on
   * EVERY attempt (a non-settling one just bumps updatedAt) — updatedAt is
   * the ledger's last-activity signal: the reconcile sweep treats a PENDING
   * message whose updatedAt predates the largest ladder gap as orphaned
   * (its job was lost with Redis). Never throws.
   *
   * Settling is CAS-guarded like every other transition in this file (a
   * stalled-and-reclaimed job can produce two writers for one message):
   * FAILED only lands on a PENDING row, while DELIVERED is STICKY — it may
   * overwrite FAILED, because a late success proves the message WAS
   * delivered, but nothing may overwrite DELIVERED. updateMany on purpose:
   * losing the settle race must keep the attempt row, not throw P2025 and
   * roll the transaction back.
   */
  async recordAttempt(messageId: string, result: OutboundAttemptResult): Promise<void> {
    const status = result.success
      ? OutboundMessageStatus.DELIVERED
      : result.final
        ? OutboundMessageStatus.FAILED
        : null;
    // Prisma promises are single-shot: build fresh operations per try.
    const runSettleTransaction = () =>
      this.prisma.$transaction([
        this.prisma.outboundDelivery.create({
          data: {
            messageId,
            attempt: result.attempt,
            success: result.success,
            responseStatus: result.responseStatus ?? null,
            responseBody: truncate(result.responseBody, OUTBOUND_RESPONSE_BODY_MAX_LENGTH),
            error: truncate(result.error, OUTBOUND_ERROR_MAX_LENGTH),
            durationMs: result.durationMs ?? null,
          },
        }),
        this.prisma.outboundMessage.updateMany({
          where: {
            id: messageId,
            status:
              status === OutboundMessageStatus.DELIVERED
                ? { in: [OutboundMessageStatus.PENDING, OutboundMessageStatus.FAILED] }
                : OutboundMessageStatus.PENDING,
          },
          data: status ? { status } : { updatedAt: new Date() },
        }),
      ]);
    for (let attemptIndex = 0; ; attemptIndex++) {
      try {
        await runSettleTransaction();
        return;
      } catch (error) {
        if (attemptIndex < RECORD_ATTEMPT_WRITE_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 50 * (attemptIndex + 1)));
          continue;
        }
        this.logger.error(`Failed to record outbound attempt for ${messageId}`, error as Error);
        return;
      }
    }
  }

  /**
   * PENDING webhook messages with no delivery activity since `olderThan` —
   * their in-flight job is presumed lost (Redis restart/eviction mid-ladder).
   * Oldest first so a capped sweep drains the backlog across runs.
   * (Integrations will add their own transport filter when they arrive.)
   */
  async findOrphanedPendingWebhookMessages(olderThan: Date, take: number) {
    return this.prisma.outboundMessage.findMany({
      where: {
        webhookId: { not: null },
        status: OutboundMessageStatus.PENDING,
        updatedAt: { lt: olderThan },
      },
      orderBy: { updatedAt: 'asc' },
      take,
      // The sweep only needs the continuation inputs — count and success
      // flags — not full attempt rows with response/error text.
      select: {
        id: true,
        webhookId: true,
        topic: true,
        payload: true,
        updatedAt: true,
        deliveries: { select: { success: true } },
      },
    });
  }

  /**
   * Claim an orphaned PENDING message for re-queueing (CAS on updatedAt, same
   * discipline as the resend claim): the write is the claim, so concurrent
   * sweeps — or a not-actually-lost job recording an attempt right now —
   * lose at the database instead of double-queueing. Returns the new
   * generation stamp (keys the continuation jobId), or null when lost.
   */
  async claimForReconcile(id: string, asOf: Date): Promise<Date | null> {
    const claimStamp = new Date();
    const { count } = await this.prisma.outboundMessage.updateMany({
      where: { id, updatedAt: asOf, status: OutboundMessageStatus.PENDING },
      data: { updatedAt: claimStamp },
    });
    return count > 0 ? claimStamp : null;
  }

  /** A message with its attempts (oldest first), or null. */
  async getMessage(id: string) {
    return this.prisma.outboundMessage.findUnique({
      where: { id },
      include: { deliveries: { orderBy: { attempt: 'asc' } } },
    });
  }

  /**
   * Atomically claim a settled message for a manual re-send (CAS: only
   * DELIVERED/FAILED -> PENDING). `asOf` is the updatedAt the caller read the
   * message at — every attempt settlement bumps it, so matching on it closes
   * the ABA hole where the status has returned to FAILED/DELIVERED but a whole
   * other resend cycle ran in between (the stale caller would otherwise
   * enqueue with an outdated attempt offset and a colliding jobId).
   *
   * On success the row's updatedAt is set to the returned claim stamp — the
   * token identifying THIS claim generation. `releaseResendClaim` must present
   * it, so a delayed rollback can only undo its own claim, never a successor's.
   * Returns null when the claim is lost — already PENDING, or the message moved.
   */
  async claimForResend(id: string, asOf: Date): Promise<Date | null> {
    const claimStamp = new Date();
    const { count } = await this.prisma.outboundMessage.updateMany({
      where: {
        id,
        updatedAt: asOf,
        status: { in: [OutboundMessageStatus.DELIVERED, OutboundMessageStatus.FAILED] },
      },
      // Explicit updatedAt: overrides @updatedAt so the claim generation is a
      // value the caller knows (rather than a DB-side timestamp it would have
      // to read back).
      data: { status: OutboundMessageStatus.PENDING, updatedAt: claimStamp },
    });
    return count > 0 ? claimStamp : null;
  }

  /**
   * Roll a failed claim back (enqueue verifiably failed after
   * claimForResend). Guarded on PENDING *and* the claim stamp: if a worker
   * already settled the status — or a successor claimed the message again —
   * this no-ops instead of clobbering state that is no longer ours.
   */
  async releaseResendClaim(
    id: string,
    claimStamp: Date,
    previousStatus: OutboundMessageStatus,
  ): Promise<void> {
    await this.prisma.outboundMessage.updateMany({
      where: { id, status: OutboundMessageStatus.PENDING, updatedAt: claimStamp },
      data: { status: previousStatus },
    });
  }

  /** Relay-connection page of a destination's messages, newest first, attempts included. */
  async listMessages(
    destination: OutboundDestination,
    pagination: { first?: number; last?: number; after?: string; before?: string },
  ) {
    const where = destination;
    return findManyCursorConnection(
      (args) =>
        this.prisma.outboundMessage.findMany({
          where,
          // Secondary `id` sort: stable tiebreak for rows sharing a createdAt.
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: { deliveries: { orderBy: { attempt: 'asc' } } },
          ...args,
        }),
      () => this.prisma.outboundMessage.count({ where }),
      pagination,
    );
  }

  /** Retention sweep: drop messages (and, by cascade, their attempts) past the window. */
  async deleteExpired(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - OUTBOUND_MESSAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.outboundMessage.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return count;
  }
}

const truncate = (value: string | null | undefined, max: number): string | null => {
  if (value == null || value === '') {
    return null;
  }
  // Strip NUL bytes: Postgres text columns reject \u0000, and a receiver
  // echoing one back would otherwise fail the whole recordAttempt transaction
  // — the message would sit PENDING despite a delivered attempt, and the
  // reconcile sweep would re-deliver it forever.
  const sanitized = value.split('\u0000').join('');
  if (sanitized === '') {
    return null; // The column's documented empty representation is NULL.
  }
  return sanitized.length > max ? sanitized.slice(0, max) : sanitized;
};
