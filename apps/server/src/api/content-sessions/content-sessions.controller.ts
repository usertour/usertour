import { Controller, Get, Param, Query, UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { EnvironmentDecorator } from '@/common/decorators/environment.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { Environment } from '@/environments/models/environment.model';

import { ApiValidationPipe } from '../shared/validation.pipe';
import { ApiContentSessionsService } from './content-sessions.service';
import {
  ContentSessionDto,
  GetContentSessionQueryDto,
  ListContentSessionsQueryDto,
  ListContentSessionsResponseDto,
} from './content-sessions.schema';

@ApiTags('Content sessions (v2)')
@Controller('v2/projects/:projectId/environments/:environmentId/content-sessions')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiContentSessionsController {
  constructor(private readonly service: ApiContentSessionsService) {}

  @Get()
  @RequireCapability(Capability.BizdataRead)
  @ApiOperation({ summary: 'List content sessions' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiResponse({
    status: 200,
    description: 'List of content sessions',
    type: ListContentSessionsResponseDto,
  })
  async list(
    @RequestUrl() requestUrl: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: ListContentSessionsQueryDto,
  ) {
    return this.service.list(requestUrl, environment, query);
  }

  @Get(':id')
  @RequireCapability(Capability.BizdataRead)
  @ApiOperation({ summary: 'Get a content session' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiParam({ name: 'id', description: 'Content session ID' })
  @ApiResponse({ status: 200, description: 'Content session found', type: ContentSessionDto })
  @ApiResponse({ status: 404, description: 'Content session not found' })
  async get(
    @Param('id') id: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: GetContentSessionQueryDto,
  ) {
    return this.service.get(id, environment, query);
  }
}
