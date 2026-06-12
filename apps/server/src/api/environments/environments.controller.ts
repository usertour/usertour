import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
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
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';

import { ApiValidationPipe } from '../shared/validation.pipe';
import { ApiEnvironmentsService } from './environments.service';
import {
  CreateEnvironmentBodyDto,
  EnvironmentDto,
  ListEnvironmentsQueryDto,
  ListEnvironmentsResponseDto,
  UpdateEnvironmentBodyDto,
} from './environments.schema';

/** Environments — project-level. Read (environment:read) + create/rename/delete (environment:manage). */
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

  @Post()
  @RequireCapability(Capability.EnvironmentManage)
  @ApiOperation({
    summary: 'Create an environment',
    description: 'Create an environment in the project. The first one is made primary.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Environment created', type: EnvironmentDto })
  async create(@Param('projectId') projectId: string, @Body() body: CreateEnvironmentBodyDto) {
    return this.service.create(projectId, body);
  }

  @Patch(':id')
  @RequireCapability(Capability.EnvironmentManage)
  @ApiOperation({ summary: 'Update an environment', description: 'Rename an environment.' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Environment ID' })
  @ApiResponse({ status: 200, description: 'Environment updated', type: EnvironmentDto })
  @ApiResponse({ status: 404, description: 'Environment not found' })
  async update(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Body() body: UpdateEnvironmentBodyDto,
  ) {
    return this.service.update(id, projectId, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireCapability(Capability.EnvironmentManage)
  @ApiOperation({
    summary: 'Delete an environment',
    description: 'Delete an environment. The primary / last environment cannot be deleted.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Environment ID' })
  @ApiResponse({ status: 204, description: 'Environment deleted' })
  @ApiResponse({ status: 404, description: 'Environment not found' })
  async remove(@Param('id') id: string, @Param('projectId') projectId: string) {
    await this.service.delete(id, projectId);
  }
}
