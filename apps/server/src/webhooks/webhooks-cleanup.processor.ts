import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from 'nestjs-prisma';
import { QUEUE_CLEAN_WEBHOOK_DELIVERIES } from '@/common/consts/queen';

export const WEBHOOK_DELIVERY_RETENTION_DAYS = 30;

/** Drops delivery-log rows past the retention window (daily repeatable job). */
@Processor(QUEUE_CLEAN_WEBHOOK_DELIVERIES)
export class WebhooksCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksCleanupProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const cutoff = new Date(Date.now() - WEBHOOK_DELIVERY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.webhookDelivery.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (count > 0) {
      this.logger.log(
        `Cleaned up ${count} webhook delivery rows older than ${cutoff.toISOString()}`,
      );
    }
  }
}
