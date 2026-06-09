import { Controller, Get, Query, UseGuards, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Environment } from '@/environments/models/environment.model';
import { OpenAPIAttributeDefinitionsService } from './attribute-definitions.service';
import { OpenAPIKeyGuard } from '@/openapi/openapi.guard';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { EnvironmentDecorator } from '@/common/decorators/environment.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { ListAttributeDefinitionsQueryDto } from './attribute-definitions.dto';

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
    @Query() query: ListAttributeDefinitionsQueryDto,
  ) {
    return this.openAPIAttributeDefinitionsService.listAttributeDefinitions(
      requestUrl,
      environment,
      query,
    );
  }
}
