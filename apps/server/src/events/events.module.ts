import { ProjectsModule } from '@/projects/projects.module';
import { Module } from '@nestjs/common';
import { EventsGuard } from './events.guard';
import { EventsResolver } from './events.resolver';
import { EventsService } from './events.service';

@Module({
  imports: [ProjectsModule],
  providers: [EventsResolver, EventsService, EventsGuard],
  exports: [EventsService],
})
export class EventsModule {}
