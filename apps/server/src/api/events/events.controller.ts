import { Body, Controller, Post, UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { EnvironmentDecorator } from '@/common/decorators/environment.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { Environment } from '@/environments/models/environment.model';
import { EventTrackingService } from '@/web-socket/core/event-tracking.service';

import { ApiStandardErrorResponses } from '../shared/error-response';
import { ApiValidationPipe } from '../shared/validation.pipe';
import { mapEvent } from './event.mapper';
import { EventDto, TrackEventBodyDto } from './event.schema';

/**
 * Server-side event ingestion: integrations (Zapier and friends) and
 * customer backends record behavior events without a browser session.
 * Delivery fan-out (webhooks, analytics destinations) happens exactly as
 * for SDK-tracked events.
 */
@ApiTags('Events')
@Controller('v2/projects/:projectId/environments/:environmentId/events')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
@ApiStandardErrorResponses()
export class ApiEventsController {
  constructor(private readonly eventTracking: EventTrackingService) {}

  @Post()
  @RequireCapability(Capability.UserWrite)
  @ApiOperation({
    summary: 'Track an event',
    description:
      'Records a behavior event for a user. Unseen users are created; an unknown event name ' +
      'registers a definition on first use; built-in Usertour event names are refused.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiResponse({ status: 201, description: 'The recorded event', type: EventDto })
  async track(
    @EnvironmentDecorator() environment: Environment,
    @Body() body: TrackEventBodyDto,
  ): Promise<EventDto> {
    const bizEvent = await this.eventTracking.trackServerEvent({
      environment: { id: environment.id, projectId: environment.projectId },
      externalUserId: body.userId,
      companyExternalId: body.companyId,
      codeName: body.name,
      attributes: body.attributes ?? {},
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
    });
    return mapEvent(bizEvent);
  }
}
