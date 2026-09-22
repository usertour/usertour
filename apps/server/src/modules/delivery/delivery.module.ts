import { Module } from '@nestjs/common';

import { LicenseModule } from '@/license/license.module';
import { BizModule } from '@/modules/biz/biz.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { SharedModule } from '@/shared/shared.module';

import { AnnouncementService } from './services/announcement.service';
import { ConditionEvaluationService } from './services/condition-evaluation.service';
import { ContentDataService } from './services/content-data.service';
import { ContentDiagnosisService } from './services/content-diagnosis.service';
import { DistributedLockService } from './services/distributed-lock.service';
import { EventTrackingService } from './services/event-tracking.service';
import { SessionBuilderService } from './services/session-builder.service';

/**
 * The SDK delivery runtime: what an identified user is shown right now —
 * which published content is deliverable, how a session is built, how start
 * and hide conditions evaluate, what an event tracks, and why a content is
 * not showing (diagnosis). The websocket gateways, the REST event endpoint and
 * the MCP diagnose tools all call it; none of it knows a socket exists.
 */
@Module({
  imports: [BizModule, LicenseModule, ProjectsModule, SharedModule],
  providers: [
    AnnouncementService,
    ConditionEvaluationService,
    ContentDataService,
    ContentDiagnosisService,
    DistributedLockService,
    EventTrackingService,
    SessionBuilderService,
  ],
  exports: [
    AnnouncementService,
    ConditionEvaluationService,
    ContentDataService,
    ContentDiagnosisService,
    DistributedLockService,
    EventTrackingService,
    SessionBuilderService,
  ],
})
export class DeliveryModule {}
