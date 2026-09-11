import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@/auth/auth.module';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { BizModule } from '@/biz/biz.module';
import {
  QUEUE_OBJECT_SYNC,
  QUEUE_OBJECT_SYNC_CRON,
  QUEUE_INTEGRATION_DELIVERY,
  QUEUE_INTEGRATION_RECONCILE,
} from '@/common/consts/queen';
import { OutboundModule } from '@/outbound/outbound.module';
import { ProjectsModule } from '@/projects/projects.module';
import { SharedModule } from '@/shared/shared.module';
import { CohortSyncService } from './cohort-sync.service';
import { ProviderConnectionService } from './sync/provider-connection.service';
import { HubspotJournalService } from './sync/hubspot-journal.service';
import { ObjectMappingService } from './sync/object-mapping.service';
import { SyncTeardownService } from './sync/sync-teardown.service';
import { ObjectSyncListener } from './sync/object-sync.listener';
import { ObjectSyncProcessor } from './sync/object-sync.processor';
import { ObjectSyncScheduler } from './sync/object-sync.scheduler';
import { ObjectSyncService } from './sync/object-sync.service';
import { HubspotOAuthController } from './sync/hubspot-oauth.controller';
import { InboundController } from './inbound.controller';
import { IntegrationsListener } from './integrations.listener';
import { IntegrationsProcessor } from './integrations.processor';
import { IntegrationsReconcileProcessor } from './integrations-reconcile.processor';
import { IntegrationsResolver } from './integrations.resolver';
import { IntegrationsService } from './integrations.service';

/**
 * Outbound integrations (ADR 0011): dashboard CRUD (resolver/service) plus
 * the delivery pipeline (listener -> BullMQ -> processor -> provider
 * adapters), recording into the shared outbound ledger (OutboundModule). The
 * BIZ_EVENT_TRACKED producers live in their own modules and emit via the
 * global EventEmitter2 — they don't import this module.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_INTEGRATION_DELIVERY }),
    BullModule.registerQueue({ name: QUEUE_INTEGRATION_RECONCILE, prefix: 'outbound_cron' }),
    BullModule.registerQueue({ name: QUEUE_OBJECT_SYNC }),
    BullModule.registerQueue({ name: QUEUE_OBJECT_SYNC_CRON, prefix: 'outbound_cron' }),
    OutboundModule,
    ProjectsModule,
    SharedModule,
    ConfigModule,
    BizModule,
    // JwtModule (signed OAuth state for CRM connections, ADR 0013 §2).
    AuthModule,
  ],
  controllers: [InboundController, HubspotOAuthController],
  providers: [
    CohortSyncService,
    ProviderConnectionService,
    ObjectMappingService,
    SyncTeardownService,
    HubspotJournalService,
    ObjectSyncService,
    ObjectSyncProcessor,
    ObjectSyncScheduler,
    ObjectSyncListener,
    IntegrationsService,
    IntegrationsResolver,
    IntegrationsListener,
    IntegrationsProcessor,
    IntegrationsReconcileProcessor,
    PermissionGuard,
  ],
  exports: [IntegrationsService, ProviderConnectionService],
})
export class IntegrationsModule {}
