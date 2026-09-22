import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { QUEUE_WEBHOOK_DELIVERY, QUEUE_WEBHOOK_RECONCILE } from '@/common/consts/queen';
import { OutboundModule } from '@/outbound/outbound.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { SharedModule } from '@/shared/shared.module';
import { WebhooksListener } from './listeners/webhooks.listener';
import { WebhooksProcessor } from './processors/webhooks.processor';
import { WebhooksReconcileProcessor } from './processors/webhooks-reconcile.processor';
import { WebhooksResolver } from './webhooks.resolver';
import { WebhooksService } from './services/webhooks.service';

/**
 * Outbound webhooks (ADR 0010): dashboard CRUD (resolver/service) plus the
 * delivery pipeline (listener -> BullMQ -> processor), recording into the
 * shared outbound ledger (OutboundModule). The BIZ_EVENT_TRACKED
 * producers live in their own modules and emit via the global EventEmitter2 —
 * they don't import this module.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_WEBHOOK_DELIVERY }),
    BullModule.registerQueue({ name: QUEUE_WEBHOOK_RECONCILE, prefix: 'outbound_cron' }),
    OutboundModule,
    ProjectsModule,
    SharedModule,
    ConfigModule,
  ],
  providers: [
    WebhooksService,
    WebhooksResolver,
    WebhooksListener,
    WebhooksProcessor,
    WebhooksReconcileProcessor,
    PermissionGuard,
  ],
  exports: [WebhooksService],
})
export class WebhooksModule {}
