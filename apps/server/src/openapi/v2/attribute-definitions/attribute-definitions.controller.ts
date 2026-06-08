import { Controller, Get, Param, Query, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';

import { ListAttributeDefinitionsQueryDto } from '../../attribute-definitions/attribute-definitions.dto';
import { OpenAPIAttributeDefinitionsService } from '../../attribute-definitions/attribute-definitions.service';

@ApiTags('Attribute Definitions (v2)')
@Controller('v2/projects/:projectId/attribute-definitions')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class OpenAPIV2AttributeDefinitionsController {
  constructor(
    private readonly openAPIAttributeDefinitionsService: OpenAPIAttributeDefinitionsService,
  ) {}

  @Get()
  @RequireCapability(Capability.AttributeRead)
  @ApiOperation({ summary: 'List attribute definitions' })
  async listAttributeDefinitions(
    @RequestUrl() requestUrl: string,
    @Param('projectId') projectId: string,
    @Query() query: ListAttributeDefinitionsQueryDto,
  ) {
    return this.openAPIAttributeDefinitionsService.listAttributeDefinitions(
      requestUrl,
      projectId,
      query,
    );
  }
}
