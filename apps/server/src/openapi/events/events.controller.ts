import { Controller, Get, Query, Logger, UseGuards, UseFilters } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OpenAPIEventsService } from './events.service';
import { Environment } from '@/environments/models/environment.model';
import { EnvironmentDecorator } from '@/common/decorators/environment.decorator';
import { OpenapiGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '../filters/openapi-exception.filter';

@ApiTags('Events')
@Controller('v1/events')
@UseGuards(OpenapiGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class OpenAPIEventsController {
  private readonly logger = new Logger(OpenAPIEventsController.name);

  constructor(private readonly eventsService: OpenAPIEventsService) {}

  @Get()
  @ApiOperation({ summary: 'List events' })
  async listEvents(
    @EnvironmentDecorator() environment: Environment,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    this.logger.log(`Listing events for environment ${environment.id}`);
    return this.eventsService.listEvents(environment.projectId, cursor, limit);
  }
}
