import {
  Controller,
  Get,
  Query,
  Logger,
  UseGuards,
  UseFilters,
  DefaultValuePipe,
  ParseArrayPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OpenAPIEventDefinitionsService } from './event-definitions.service';
import { Environment } from '@/environments/models/environment.model';
import { EnvironmentDecorator } from '@/common/decorators/environment.decorator';
import { OpenAPIKeyGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
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
    @Query('limit', new DefaultValuePipe(20)) limit: number,
    @Query('cursor') cursor?: string,
    @Query('orderBy', new ParseArrayPipe({ optional: true, items: String })) orderBy?: string[],
  ) {
    return this.openAPIEventDefinitionsService.listEventDefinitions(
      requestUrl,
      environment,
      limit,
      cursor,
      orderBy,
    );
  }
}
