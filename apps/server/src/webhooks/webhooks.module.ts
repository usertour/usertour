import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { QUEUE_CLEAN_WEBHOOK_DELIVERIES, QUEUE_WEBHOOK_DELIVERY } from '@/common/consts/queen';
import { ProjectsModule } from '@/projects/projects.module';
import { WebhooksCleanupProcessor } from './webhooks-cleanup.processor';
import { WebhooksListener } from './webhooks.listener';
import { WebhooksProcessor } from './webhooks.processor';
import { WebhooksResolver } from './webhooks.resolver';
import { WebhooksService } from './webhooks.service';

/**
 * Outbound webhooks (ADR 0010): dashboard CRUD (resolver/service) plus the
 * delivery pipeline (listener -> BullMQ -> processor). The BIZ_EVENT_TRACKED
 * producers live in their own modules and emit via the global EventEmitter2 —
 * they don't import this module.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_WEBHOOK_DELIVERY }),
    BullModule.registerQueue({ name: QUEUE_CLEAN_WEBHOOK_DELIVERIES, prefix: 'webhook_cron' }),
    ProjectsModule,
    ConfigModule,
  ],
  providers: [
    WebhooksService,
    WebhooksResolver,
    WebhooksListener,
    WebhooksProcessor,
    WebhooksCleanupProcessor,
    PermissionGuard,
  ],
  exports: [WebhooksService],
})
export class WebhooksModule {}
