import { Controller, Get, Param, Query, UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Capability } from '@usertour/types';
import { ZodValidationPipe } from 'nestjs-zod';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';

import { ApiAttributeDefinitionsService } from './attribute-definitions.service';
import {
  ListAttributeDefinitionsQueryDto,
  ListAttributeDefinitionsResponseDto,
} from './attribute-definitions.schema';

@ApiTags('Attribute definitions (v2)')
@Controller('v2/projects/:projectId/attribute-definitions')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ZodValidationPipe)
@ApiBearerAuth()
export class ApiAttributeDefinitionsController {
  constructor(private readonly service: ApiAttributeDefinitionsService) {}

  @Get()
  @RequireCapability(Capability.AttributeRead)
  @ApiOperation({ summary: 'List attribute definitions' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'List of attribute definitions',
    type: ListAttributeDefinitionsResponseDto,
  })
  async list(
    @RequestUrl() requestUrl: string,
    @Param('projectId') projectId: string,
    @Query() query: ListAttributeDefinitionsQueryDto,
  ) {
    return this.service.list(requestUrl, projectId, query);
  }
}
