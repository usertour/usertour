import { Controller, Get, Param, Query, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { EnvironmentDecorator } from '@/common/decorators/environment.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { Environment } from '@/environments/models/environment.model';

import {
  ContentSessionsOutput,
  GetContentSessionQueryDto,
  ListContentSessionsQueryDto,
} from '../../content-sessions/content-sessions.dto';
import { OpenAPIContentSessionsService } from '../../content-sessions/content-sessions.service';
import { ContentSession } from '../../models/content-session.model';

@ApiTags('Content Sessions (v2)')
@Controller('v2/projects/:projectId/environments/:environmentId/content-sessions')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class OpenAPIV2ContentSessionsController {
  constructor(private readonly openAPIContentSessionsService: OpenAPIContentSessionsService) {}

  @Get()
  @RequireCapability(Capability.BizdataRead)
  @ApiOperation({ summary: 'List all content sessions' })
  @ApiResponse({
    status: 200,
    description: 'List of content sessions',
    type: ContentSessionsOutput,
  })
  async listContentSessions(
    @RequestUrl() requestUrl: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: ListContentSessionsQueryDto,
  ): Promise<ContentSessionsOutput> {
    return this.openAPIContentSessionsService.listContentSessions(requestUrl, environment, query);
  }

  @Get(':id')
  @RequireCapability(Capability.BizdataRead)
  @ApiOperation({ summary: 'Get a content session by ID' })
  @ApiParam({ name: 'id', description: 'Content Session ID' })
  @ApiResponse({ status: 200, description: 'Content session found', type: ContentSession })
  @ApiResponse({ status: 404, description: 'Content session not found' })
  async getContentSession(
    @Param('id') id: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: GetContentSessionQueryDto,
  ): Promise<ContentSession> {
    return this.openAPIContentSessionsService.getContentSession(id, environment, query);
  }
}
