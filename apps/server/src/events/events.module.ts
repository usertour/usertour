import { PermissionGuard } from '@/auth/permission/permission.guard';
import { ProjectsModule } from '@/projects/projects.module';
import { Module } from '@nestjs/common';
import { EventsResolver } from './events.resolver';
import { EventsService } from './events.service';

@Module({
  imports: [ProjectsModule],
  providers: [EventsResolver, EventsService, PermissionGuard],
  exports: [EventsService],
})
export class EventsModule {}
