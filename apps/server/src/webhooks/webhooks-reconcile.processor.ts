import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { QUEUE_WEBHOOK_DELIVERY, QUEUE_WEBHOOK_RECONCILE } from '@/common/consts/queen';
import { OutboundLedgerService } from '@/outbound/outbound-ledger.service';
import { DELIVERY_ATTEMPTS } from './webhook-backoff';
import { WebhookDeliveryJobData } from './webhook.types';

/**
 * A PENDING message is orphaned when nothing touched it for longer than the
 * ladder's largest gap (12h) plus slack. Every legitimate silence is shorter:
 * backoff delays are capped at 12h (RETRY_AFTER_MAX_MS deliberately equals
 * the ladder max), attempts bump updatedAt when they settle into the ledger,
 * and a cooldown defer touches the row (gaps <= the 1h cooldown cap). So
 * silence past this threshold genuinely means the job was lost with Redis.
 */
export const RECONCILE_ORPHAN_AFTER_MS = 14 * 60 * 60_000; // 12h max gap + 2h slack
/** Per-sweep cap; the hourly cadence drains any realistic backlog. */
export const RECONCILE_BATCH_SIZE = 200;
export const RECONCILE_CRON_PATTERN = '20 * * * *'; // hourly at :20

/**
 * The delivery pipeline's crash-consistency backstop (ADR 0010): with the
 * ~24h retry ladder, in-flight retries live in Redis for a day — a Redis
 * loss must degrade to "delivery delayed up to the sweep cadence", never to
 * "message silently stuck PENDING forever". Re-queues each orphan as a
 * continuation job (attempt numbering picks up after the logged tries).
 *
 * Concurrency notes (docs/conventions/concurrent-state-writes.md): the claim
 * is a CAS on updatedAt — a job that is alive after all (recording attempts)
 * or a concurrent sweep instance moves the stamp and the claim loses. An
 * enqueue failure after a claim is left alone on purpose: the claim only
 * bumped updatedAt, so the row simply waits out one more orphan window and
 * the next sweep retries it.
 */
@Processor(QUEUE_WEBHOOK_RECONCILE)
export class WebhooksReconcileProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(WebhooksReconcileProcessor.name);

  constructor(
    @InjectQueue(QUEUE_WEBHOOK_RECONCILE) private readonly reconcileQueue: Queue,
    @InjectQueue(QUEUE_WEBHOOK_DELIVERY) private readonly deliveryQueue: Queue,
    private readonly ledger: OutboundLedgerService,
  ) {
    super();
  }

  // Mirrors the outbound cleanup cron pattern (repeatable job + fixed jobId
  // so it fires once per cluster); scheduling failure must not block boot.
  async onModuleInit() {
    try {
      const existingJobs = await this.reconcileQueue.getJobSchedulers();
      await Promise.all(existingJobs.map((job) => this.reconcileQueue.removeJobScheduler(job.id)));
      await this.reconcileQueue.add(
        'reconcile-webhook-messages',
        {},
        {
          repeat: { pattern: RECONCILE_CRON_PATTERN },
          jobId: 'reconcile-webhook-messages',
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      );
    } catch (error) {
      this.logger.error(`Failed to schedule webhook reconcile job: ${error}`);
    }
  }

  async process(_job: Job): Promise<void> {
    const cutoff = new Date(Date.now() - RECONCILE_ORPHAN_AFTER_MS);
    const orphans = await this.ledger.findOrphanedPendingWebhookMessages(
      cutoff,
      RECONCILE_BATCH_SIZE,
    );
    if (orphans.length === 0) {
      return;
    }

    let requeued = 0;
    for (const message of orphans) {
      const claimStamp = await this.ledger.claimForReconcile(message.id, message.updatedAt);
      if (!claimStamp) {
        continue; // Moved under us: job alive after all, or another sweep won.
      }
      const jobData: WebhookDeliveryJobData = {
        webhookId: message.webhookId as string,
        messageId: message.id,
        topic: message.topic,
        payload: message.payload as Record<string, unknown>,
        // Continue the attempt numbering after the logged tries.
        attemptOffset: message.deliveries.length,
      };
      try {
        await this.deliveryQueue.add('deliver', jobData, {
          removeOnComplete: true,
          removeOnFail: 1000,
          attempts: Math.max(1, DELIVERY_ATTEMPTS - message.deliveries.length),
          backoff: { type: 'custom' },
          // Keyed by the claim generation — an ambiguous add (job created,
          // response lost) can't double-queue within this claim.
          jobId: `reconcile-${message.id}-${claimStamp.getTime()}`,
        });
        requeued += 1;
      } catch (error) {
        // Claim stays: the row waits out one more orphan window (see class doc).
        this.logger.error(`Failed to re-queue orphaned message ${message.id}`, error as Error);
      }
    }
    this.logger.log(
      `Webhook reconcile sweep re-queued ${requeued}/${orphans.length} orphaned PENDING messages`,
    );
  }
}
