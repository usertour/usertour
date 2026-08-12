import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { QUEUE_AUDIT_LOG } from '@/common/consts/queen';
import { type AuditEntry, RESOURCE_CHANGED_EVENT } from './audit.types';

/**
 * Subscribes to the domain change event and hands persistence to Bull (durable,
 * retried, off the request path). Other consumers (webhooks, …) can add their own
 * `@OnEvent(RESOURCE_CHANGED_EVENT)` listeners without touching producers.
 */
@Injectable()
export class AuditListener {
  private readonly logger = new Logger(AuditListener.name);

  constructor(@InjectQueue(QUEUE_AUDIT_LOG) private readonly queue: Queue) {}

  @OnEvent(RESOURCE_CHANGED_EVENT, { async: true })
  async onResourceChanged(entry: AuditEntry): Promise<void> {
    try {
      await this.queue.add('write', entry, {
        removeOnComplete: true,
        removeOnFail: 1000,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
      });
    } catch (error) {
      // Side-channel: a failure to enqueue must not propagate to the business write.
      this.logger.error('Failed to enqueue audit log', error as Error);
    }
  }
}
