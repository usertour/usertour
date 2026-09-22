import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { Module } from '@nestjs/common';
import { EventsResolver } from './events.resolver';
import { EventsService } from './services/events.service';

@Module({
  imports: [ProjectsModule],
  providers: [EventsResolver, EventsService, PermissionGuard],
  exports: [EventsService],
})
export class EventsModule {}
