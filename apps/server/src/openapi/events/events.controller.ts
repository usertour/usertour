import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { Environment } from '../decorators/environment.decorator';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List events' })
  async listEvents(
    @Environment() environment: Environment,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    this.logger.log(`Listing events for environment ${environment.id}`);
    return this.eventsService.listEvents(environment.id, cursor, limit);
  }
}
