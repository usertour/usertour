import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { QUEUE_WEBHOOK_DELIVERY, QUEUE_WEBHOOK_RECONCILE } from '@/common/consts/queen';
import { WEBHOOK_TEST_TOPIC } from '@usertour/constants';
import { OutboundLedgerService } from '@/outbound/outbound-ledger.service';
import { DELIVERY_ATTEMPTS, RETRY_AFTER_MAX_MS, RETRY_DELAYS_MS } from './webhook-backoff';
import { WebhookDeliveryJobData } from './webhook.types';

/** Headroom past the longest legitimate silence before a row counts as orphaned. */
const RECONCILE_SLACK_MS = 2 * 60 * 60_000;
/**
 * A PENDING message is orphaned when nothing touched it for longer than the
 * longest legitimate silence plus slack. Legitimate silences: a backoff delay
 * (the ladder's largest gap, or a Retry-After capped by RETRY_AFTER_MAX_MS),
 * between which attempts bump updatedAt; and cooldown defers, which touch the
 * row on gaps <= the 1h cooldown cap. DERIVED, not hand-written, so raising
 * the ladder's top rung or the Retry-After cap moves this line with it —
 * a literal here silently under-covering the new maximum is exactly how the
 * false-orphan double-queue bug would come back.
 */
export const RECONCILE_ORPHAN_AFTER_MS =
  Math.max(...RETRY_DELAYS_MS, RETRY_AFTER_MAX_MS) + RECONCILE_SLACK_MS;
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
      // max(attempt), not the row count: settle-write retries and stalled
      // twins can insert duplicate delivery rows, and a count would then
      // skip ladder rungs and shrink the remaining budget.
      const attemptsLogged = message.deliveries.reduce(
        (highest, delivery) => Math.max(highest, delivery.attempt),
        0,
      );
      const jobData: WebhookDeliveryJobData = {
        webhookId: message.webhookId as string,
        messageId: message.id,
        topic: message.topic,
        payload: message.payload as Record<string, unknown>,
        // Continue the attempt numbering after the logged tries. Deliberately
        // NOT manual — the manual flag exists because "the user IS the probe",
        // watching in real time; an orphan swept up >=14h later has no one
        // waiting and must respect the cooldown gate like ordinary traffic.
        attemptOffset: attemptsLogged,
      };
      try {
        await this.deliveryQueue.add('deliver', jobData, {
          removeOnComplete: true,
          removeOnFail: 1000,
          attempts: rebuildAttemptBudget(message.topic, message.deliveries, attemptsLogged),
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

/**
 * The attempt budget a rebuilt job may spend. The ledger doesn't store the
 * lost job's budget, but it is derivable: test events are always one-shot
 * probes; a message with a DELIVERED attempt in its history can only be
 * PENDING because a manual resend (single attempt by contract) was in
 * flight; anything else is a listener-born job that continues its ladder's
 * remaining budget. (A resend of a FAILED message also lands on 1 via the
 * remainder — its history already holds the full ladder.)
 */
export const rebuildAttemptBudget = (
  topic: string,
  deliveries: Array<{ success: boolean }>,
  attemptsLogged: number,
): number => {
  if (topic === WEBHOOK_TEST_TOPIC) {
    return 1;
  }
  if (deliveries.some((delivery) => delivery.success)) {
    return 1;
  }
  return Math.max(1, DELIVERY_ATTEMPTS - attemptsLogged);
};
