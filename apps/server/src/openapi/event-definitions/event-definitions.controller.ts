import { Controller, Get, Query, Logger, UseGuards, UseFilters } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OpenAPIEventDefinitionsService } from './event-definitions.service';
import { Environment } from '@/environments/models/environment.model';
import { EnvironmentDecorator } from '@/common/decorators/environment.decorator';
import { OpenAPIKeyGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { ListEventDefinitionsQueryDto } from './event-definitions.dto';

@ApiTags('Event Definitions')
@Controller('v1/event-definitions')
@UseGuards(OpenAPIKeyGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class OpenAPIEventDefinitionsController {
  private readonly logger = new Logger(OpenAPIEventDefinitionsController.name);

  constructor(private readonly openAPIEventDefinitionsService: OpenAPIEventDefinitionsService) {}

  @Get()
  @ApiOperation({ summary: 'List event definitions' })
  async listEventDefinitions(
    @RequestUrl() requestUrl: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: ListEventDefinitionsQueryDto,
  ) {
    return this.openAPIEventDefinitionsService.listEventDefinitions(requestUrl, environment, query);
  }
}
