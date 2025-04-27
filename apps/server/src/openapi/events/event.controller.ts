import { Controller, Get, Query, Logger, UseGuards, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EventService } from './event.service';
import { Event } from '../models/event.model';
import { EnvironmentDecorator } from '../decorators/environment.decorator';
import { Environment } from '@/environments/models/environment.model';
import { OpenapiGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '../filters/openapi-exception.filter';

@ApiTags('Events')
@Controller('v1/events')
@UseGuards(OpenapiGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class EventController {
  private readonly logger = new Logger(EventController.name);

  constructor(private readonly eventService: EventService) {}

  @Get()
  @ApiOperation({ summary: 'List events' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor for pagination' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items to return',
    type: 'number',
  })
  @ApiResponse({ status: 200, description: 'List of events', type: [Event] })
  async listEvents(
    @EnvironmentDecorator() environment: Environment,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ): Promise<{ results: Event[]; next: string | null; previous: string | null }> {
    this.logger.log(
      `Listing events for environment ${environment.id} , projectId: ${environment.projectId} `,
    );
    return this.eventService.listEvents(environment.projectId, cursor, limit);
  }
}
