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
 * own failures so a logging problem can never trigger a duplicate send.
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

  /** Persist message rows (status PENDING). Call before enqueueing their jobs. */
  async createMessages(inputs: OutboundMessageInput[]): Promise<void> {
    if (inputs.length === 0) {
      return;
    }
    await this.prisma.outboundMessage.createMany({
      data: inputs.map((input) => ({
        id: input.id,
        environmentId: input.environmentId,
        topic: input.topic,
        payload: input.payload,
        ...('webhookId' in input.destination
          ? { webhookId: input.destination.webhookId }
          : { integrationId: input.destination.integrationId }),
      })),
    });
  }

  /**
   * Append an attempt row and advance the message status: DELIVERED on
   * success, FAILED when a failure exhausts the retry budget, otherwise the
   * message stays PENDING for the next try. The message row is touched on
   * EVERY attempt (a non-settling one just bumps updatedAt) — updatedAt is
   * the ledger's last-activity signal: the reconcile sweep treats a PENDING
   * message whose updatedAt predates the largest ladder gap as orphaned
   * (its job was lost with Redis). Never throws.
   */
  async recordAttempt(messageId: string, result: OutboundAttemptResult): Promise<void> {
    const status = result.success
      ? OutboundMessageStatus.DELIVERED
      : result.final
        ? OutboundMessageStatus.FAILED
        : null;
    try {
      await this.prisma.$transaction([
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
        this.prisma.outboundMessage.update({
          where: { id: messageId },
          data: status ? { status } : { updatedAt: new Date() },
        }),
      ]);
    } catch (error) {
      this.logger.error(`Failed to record outbound attempt for ${messageId}`, error as Error);
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
      include: { deliveries: { orderBy: { attempt: 'asc' } } },
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
  return value.length > max ? value.slice(0, max) : value;
};
