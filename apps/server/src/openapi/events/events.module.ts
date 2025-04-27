import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsService as BusinessEventsService } from '../../events/events.service';

@Module({
  controllers: [EventsController],
  providers: [EventsService, BusinessEventsService],
  exports: [EventsService],
})
export class EventsModule {}
