import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from 'nestjs-prisma';
import { QUEUE_OBJECT_SYNC_CRON } from '@/common/consts/queen';
import { HubspotJournalService } from './hubspot-journal.service';
import { ObjectSyncService, FULL_SYNC_INTERVAL_MS, ROUND_STALE_MS } from './object-sync.service';

const SCAN_JOB = 'object-sync-scan';
/** Offset from the webhook (:20) and integration (:35) reconcile sweeps. */
const SCAN_PATTERN = '50 * * * *';
/** Sync activity is kept as long as the message log. */
const SYNC_RUN_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const JOURNAL_JOB = 'hubspot-journal-poll';
/** Provider change journal poll cadence (ADR 0013 §7). */
const JOURNAL_EVERY_MS = 30_000;

/**
 * Hourly scan that starts the recurring full sync for every mapping whose
 * last round is older than the interval (ADR 0013 §7). One repeatable job
 * for the whole deployment: mapping churn never touches the scheduler, and
 * load spreads naturally as mappings finish at different times.
 */
@Processor(QUEUE_OBJECT_SYNC_CRON)
export class ObjectSyncScheduler extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(ObjectSyncScheduler.name);

  constructor(
    @InjectQueue(QUEUE_OBJECT_SYNC_CRON) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly sync: ObjectSyncService,
    private readonly journal: HubspotJournalService,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    try {
      const schedulers = await this.queue.getJobSchedulers();
      for (const scheduler of schedulers) {
        await this.queue.removeJobScheduler(scheduler.id);
      }
      await this.queue.add(
        SCAN_JOB,
        {},
        {
          repeat: { pattern: SCAN_PATTERN },
          jobId: SCAN_JOB,
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      );
      await this.queue.add(
        JOURNAL_JOB,
        {},
        {
          repeat: { every: JOURNAL_EVERY_MS },
          jobId: JOURNAL_JOB,
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to schedule the object sync scan: ${(error as Error).message}`);
    }
  }

  async process(job: Job): Promise<void> {
    if (job.name === JOURNAL_JOB) {
      try {
        await this.journal.poll();
      } catch (error) {
        this.logger.warn(`HubSpot journal poll failed: ${(error as Error).message}`);
      }
      return;
    }
    const now = Date.now();
    const due = await this.prisma.integrationObjectMapping.findMany({
      where: {
        enabled: true,
        AND: [
          // Idle, or a round whose stamp is older than the stale window (a
          // job lost without a failure event) — startFullSync takes those over.
          {
            OR: [
              { fullSyncStartedAt: null },
              { fullSyncStartedAt: { lt: new Date(now - ROUND_STALE_MS) } },
            ],
          },
          {
            OR: [
              { lastFullSyncAt: null },
              { lastFullSyncAt: { lt: new Date(now - FULL_SYNC_INTERVAL_MS) } },
            ],
          },
        ],
        integration: { enabled: true, oauthCredentials: { not: null } },
      },
      select: { id: true },
    });
    await this.prisma.integrationSyncRun.deleteMany({
      where: { startedAt: { lt: new Date(Date.now() - SYNC_RUN_RETENTION_MS) } },
    });
    for (const mapping of due) {
      try {
        await this.sync.startFullSync(mapping.id, { manual: false });
      } catch (error) {
        this.logger.warn(
          `Object sync scan could not start mapping ${mapping.id}: ${(error as Error).message}`,
        );
      }
    }
  }
}
