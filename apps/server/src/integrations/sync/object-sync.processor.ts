import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { QUEUE_OBJECT_SYNC } from '@/common/consts/queen';
import { deliveryBackoffStrategy, type RetryAfterCarrier } from '@/outbound/delivery-backoff';
import {
  SYNC_BACKFILL_JOB,
  type SyncBackfillJobData,
  type SyncPageJobData,
  ObjectSyncService,
} from './object-sync.service';
import {
  HubspotRateLimitError,
  describeHubspotError,
  isDefinitiveHubspotError,
} from './hubspot-errors';
import { GrantRevokedError } from './provider-connection.service';

/**
 * Runs one full-sync page per job (ADR 0013 §7). Concurrency stays low:
 * HubSpot's limits are per account, and a mapping's pages are sequential by
 * construction (each page enqueues the next). A provider rate limit carries
 * its Retry-After into the shared delivery backoff ladder; a refused request
 * (4xx) skips the ladder and closes the round with HubSpot's reason.
 */
@Processor(QUEUE_OBJECT_SYNC, {
  concurrency: 2,
  settings: { backoffStrategy: deliveryBackoffStrategy },
})
export class ObjectSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(ObjectSyncProcessor.name);

  constructor(private readonly sync: ObjectSyncService) {
    super();
  }

  async process(job: Job<SyncPageJobData | SyncBackfillJobData>): Promise<void> {
    try {
      if (job.name === SYNC_BACKFILL_JOB) {
        await this.sync.backfillRecord(job.data as SyncBackfillJobData);
      } else {
        await this.sync.processPage(job.data as SyncPageJobData);
      }
    } catch (error) {
      if (error instanceof HubspotRateLimitError) {
        (error as unknown as RetryAfterCarrier).retryAfterMs = error.retryAfterMs;
      } else if (isDefinitiveHubspotError(error)) {
        // Refused, not delayed: no rung of the ladder changes a 4xx. The
        // message is what the operator reads in the sync activity.
        throw new UnrecoverableError(describeHubspotError(error));
      }
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<SyncPageJobData | SyncBackfillJobData> | undefined,
    error: Error,
  ): Promise<void> {
    if (!job) {
      return;
    }
    // A job failed for stalling is not retried and does not bump attemptsMade,
    // so it has to count as exhausted here or the round would never close.
    // A refused request (UnrecoverableError) and a revoked grant are not
    // retried either: they are definitive by construction.
    const stalled = /stalled/i.test(error.message);
    const definitive = error instanceof UnrecoverableError || error instanceof GrantRevokedError;
    const exhausted = stalled || definitive || job.attemptsMade >= (job.opts.attempts ?? 1);
    const reason = describeHubspotError(error);
    this.logger.warn(
      `Object sync ${job.name} failed (mapping ${job.data.mappingId}, attempt ${job.attemptsMade}${
        exhausted ? ', giving up' : ''
      }): ${reason}`,
    );
    if (error instanceof GrantRevokedError) {
      // Definitive: switch the integration off now rather than after the ladder.
      await this.sync.handleGrantRevoked(job.data.mappingId);
    }
    if (job.name === SYNC_BACKFILL_JOB) {
      return;
    }
    if (exhausted) {
      await this.sync.abandonRound(job.data as SyncPageJobData, reason);
      return;
    }
    // Waiting on the ladder is not silence: keep the round's heartbeat fresh
    // so the stale sweep does not take it over mid-retry.
    await this.sync.touchRound(job.data as SyncPageJobData);
  }
}
