import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseFilters,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
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

@ApiTags('Sessions')
@Controller('v2/projects/:projectId/environments/:environmentId/sessions')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiContentSessionsController {
  constructor(private readonly service: ApiContentSessionsService) {}

  @Get()
  @RequireCapability(Capability.SessionRead)
  @ApiOperation({
    summary: 'List sessions',
    description: 'Sessions in this environment. Filter by contentId / userId.',
  })
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
  @RequireCapability(Capability.SessionRead)
  @ApiOperation({ summary: 'Get a session' })
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

  @Delete(':id')
  @HttpCode(204)
  @RequireCapability(Capability.SessionManage)
  @ApiOperation({ summary: 'Delete a session' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiParam({ name: 'id', description: 'Content session ID' })
  @ApiResponse({ status: 204, description: 'Content session deleted' })
  @ApiResponse({ status: 404, description: 'Content session not found' })
  async remove(@Param('id') id: string, @EnvironmentDecorator() environment: Environment) {
    await this.service.delete(id, environment);
  }

  @Post(':id/end')
  @HttpCode(200)
  @RequireCapability(Capability.SessionManage)
  @ApiOperation({ summary: 'End a session' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiParam({ name: 'id', description: 'Content session ID' })
  @ApiResponse({ status: 200, description: 'Content session ended', type: ContentSessionDto })
  @ApiResponse({ status: 404, description: 'Content session not found' })
  async end(@Param('id') id: string, @EnvironmentDecorator() environment: Environment) {
    return this.service.end(id, environment);
  }
}
