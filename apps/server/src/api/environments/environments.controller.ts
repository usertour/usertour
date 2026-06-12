import { Controller, Get, Param, Query, UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';

import { ApiValidationPipe } from '../shared/validation.pipe';
import { ApiEnvironmentsService } from './environments.service';
import {
  EnvironmentDto,
  ListEnvironmentsQueryDto,
  ListEnvironmentsResponseDto,
} from './environments.schema';

/** Environments — project-level read-only metadata (the ids env-scoped routes accept). */
@ApiTags('Environments')
@Controller('v2/projects/:projectId/environments')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiEnvironmentsController {
  constructor(private readonly service: ApiEnvironmentsService) {}

  @Get()
  @RequireCapability(Capability.EnvironmentRead)
  @ApiOperation({ summary: 'List environments' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'List of environments',
    type: ListEnvironmentsResponseDto,
  })
  async list(
    @RequestUrl() requestUrl: string,
    @Param('projectId') projectId: string,
    @Query() query: ListEnvironmentsQueryDto,
  ) {
    return this.service.list(requestUrl, projectId, query);
  }

  @Get(':id')
  @RequireCapability(Capability.EnvironmentRead)
  @ApiOperation({ summary: 'Get an environment' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Environment ID' })
  @ApiResponse({ status: 200, description: 'Environment found', type: EnvironmentDto })
  @ApiResponse({ status: 404, description: 'Environment not found' })
  async get(@Param('id') id: string, @Param('projectId') projectId: string) {
    return this.service.get(id, projectId);
  }
}
