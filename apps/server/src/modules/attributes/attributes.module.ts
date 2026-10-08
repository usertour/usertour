import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { CommonModule } from '@/modules/common/common.module';
import { ReferencesModule } from '@/modules/references/references.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AttributesResolver } from './attributes.resolver';
import { QUEUE_ATTRIBUTE_BACKFILL } from './constants/attribute-queues.constant';
import { AttributeBackfillProcessor } from './processors/attribute-backfill.processor';
import { AttributesService } from './services/attributes.service';

@Module({
  imports: [
    ProjectsModule,
    CommonModule,
    ReferencesModule,
    BullModule.registerQueue({ name: QUEUE_ATTRIBUTE_BACKFILL }),
  ],
  providers: [AttributesResolver, AttributesService, AttributeBackfillProcessor, PermissionGuard],
  exports: [AttributesService],
})
export class AttributesModule {}
