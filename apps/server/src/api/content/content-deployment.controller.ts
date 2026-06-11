import {
  Body,
  Controller,
  Delete,
  Param,
  Put,
  UseFilters,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { EnvironmentDecorator } from '@/common/decorators/environment.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { Environment } from '@/environments/models/environment.model';

import { ApiValidationPipe } from '../shared/validation.pipe';
import { ContentDto, PublishContentBodyDto } from './content.schema';
import { ApiContentService } from './content.service';

/**
 * The deployment surface: a content's live version in an environment
 * (ContentOnEnvironment). Env-scoped — `PUT` sets it (publish), `DELETE` clears it
 * (unpublish) — mirroring how sessions hang off `environments/:e/content/:id`.
 */
@ApiTags('Content')
@Controller('v2/projects/:projectId/environments/:environmentId/content')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiContentDeploymentController {
  constructor(private readonly service: ApiContentService) {}

  @Put(':id')
  @RequireCapability(Capability.ContentPublish)
  @ApiOperation({
    summary: 'Publish a content version to an environment',
    description: "Publish a version as this environment's live version (idempotent).",
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({ status: 200, description: 'Published; returns the content', type: ContentDto })
  @ApiResponse({ status: 404, description: 'Content or version not found' })
  async publish(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @EnvironmentDecorator() environment: Environment,
    @Body() body: PublishContentBodyDto,
  ) {
    return this.service.publish(id, projectId, environment.id, body.versionId);
  }

  @Delete(':id')
  @RequireCapability(Capability.ContentPublish)
  @ApiOperation({
    summary: 'Unpublish a content version from an environment',
    description: "Clear this environment's live version for the content.",
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({ status: 200, description: 'Unpublished; returns the content', type: ContentDto })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async unpublish(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @EnvironmentDecorator() environment: Environment,
  ) {
    return this.service.unpublish(id, projectId, environment.id);
  }
}
