import { Controller, Get, Param, Query, UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';

import { ApiValidationPipe } from '../shared/validation.pipe';
import { ApiEventDefinitionsService } from './event-definitions.service';
import {
  ListEventDefinitionsQueryDto,
  ListEventDefinitionsResponseDto,
} from './event-definitions.schema';

@ApiTags('Event definitions')
@Controller('v2/projects/:projectId/event-definitions')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiEventDefinitionsController {
  constructor(private readonly service: ApiEventDefinitionsService) {}

  @Get()
  @RequireCapability(Capability.EventRead)
  @ApiOperation({ summary: 'List event definitions' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'List of event definitions',
    type: ListEventDefinitionsResponseDto,
  })
  async list(
    @RequestUrl() requestUrl: string,
    @Param('projectId') projectId: string,
    @Query() query: ListEventDefinitionsQueryDto,
  ) {
    return this.service.list(requestUrl, projectId, query);
  }
}
