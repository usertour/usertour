import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseFilters,
  ParseArrayPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Environment } from '@/environments/models/environment.model';
import { OpenAPIAttributeDefinitionsService } from './attribute-definitions.service';
import { OpenAPIKeyGuard } from '@/openapi/openapi.guard';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { EnvironmentDecorator } from '@/common/decorators/environment.decorator';
import { OpenApiObjectType } from '@/common/openapi/types';
import { RequestUrl } from '@/common/decorators/request-url.decorator';

@ApiTags('Attribute Definitions')
@Controller('v1/attribute-definitions')
@UseGuards(OpenAPIKeyGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class OpenAPIAttributeDefinitionsController {
  constructor(
    private readonly openAPIAttributeDefinitionsService: OpenAPIAttributeDefinitionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List attribute definitions' })
  async listAttributeDefinitions(
    @RequestUrl() requestUrl: string,
    @EnvironmentDecorator() environment: Environment,
    @Query('limit', new DefaultValuePipe(20)) limit: number,
    @Query('scope') scope?: OpenApiObjectType,
    @Query('cursor') cursor?: string,
    @Query('orderBy', new ParseArrayPipe({ optional: true, items: String })) orderBy?: string[],
    @Query('eventName', new ParseArrayPipe({ optional: true, items: String })) eventName?: string[],
  ) {
    return this.openAPIAttributeDefinitionsService.listAttributeDefinitions(
      requestUrl,
      environment,
      limit,
      scope,
      cursor,
      orderBy,
      eventName,
    );
  }
}
