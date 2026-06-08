import { Controller, Get, Param, Query, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';

import { ListEventDefinitionsQueryDto } from '../../event-definitions/event-definitions.dto';
import { OpenAPIEventDefinitionsService } from '../../event-definitions/event-definitions.service';

@ApiTags('Event Definitions (v2)')
@Controller('v2/projects/:projectId/event-definitions')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class OpenAPIV2EventDefinitionsController {
  constructor(private readonly openAPIEventDefinitionsService: OpenAPIEventDefinitionsService) {}

  @Get()
  @RequireCapability(Capability.EventRead)
  @ApiOperation({ summary: 'List event definitions' })
  async listEventDefinitions(
    @RequestUrl() requestUrl: string,
    @Param('projectId') projectId: string,
    @Query() query: ListEventDefinitionsQueryDto,
  ) {
    return this.openAPIEventDefinitionsService.listEventDefinitions(requestUrl, projectId, query);
  }
}
