import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
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
import { ApiContentService } from './content.service';
import {
  ContentDto,
  CreateContentBodyDto,
  DuplicateContentBodyDto,
  GetContentQueryDto,
  ListContentQueryDto,
  ListContentResponseDto,
  PublishContentBodyDto,
  UpdateContentBodyDto,
} from './content.schema';

@ApiTags('Content')
@Controller('v2/projects/:projectId/content')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiContentController {
  constructor(private readonly service: ApiContentService) {}

  @Get()
  @RequireCapability(Capability.ContentRead)
  @ApiOperation({ summary: 'List content' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'List of content', type: ListContentResponseDto })
  async list(
    @RequestUrl() requestUrl: string,
    @Param('projectId') projectId: string,
    @Query() query: ListContentQueryDto,
  ) {
    return this.service.list(requestUrl, projectId, query);
  }

  @Get(':id')
  @RequireCapability(Capability.ContentRead)
  @ApiOperation({ summary: 'Get a content' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({ status: 200, description: 'Content found', type: ContentDto })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async get(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Query() query: GetContentQueryDto,
  ) {
    return this.service.get(id, projectId, query);
  }

  @Post()
  @RequireCapability(Capability.ContentCreate)
  @ApiOperation({ summary: 'Create a content' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Content created', type: ContentDto })
  async create(@Param('projectId') projectId: string, @Body() body: CreateContentBodyDto) {
    return this.service.create(projectId, body);
  }

  @Patch(':id')
  @RequireCapability(Capability.ContentUpdate)
  @ApiOperation({
    summary: 'Update a content',
    description: 'Update content metadata (name, buildUrl).',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({ status: 200, description: 'Content updated', type: ContentDto })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async update(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Body() body: UpdateContentBodyDto,
  ) {
    return this.service.update(id, projectId, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireCapability(Capability.ContentDelete)
  @ApiOperation({ summary: 'Delete a content' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({ status: 204, description: 'Content deleted' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async remove(@Param('id') id: string, @Param('projectId') projectId: string) {
    await this.service.remove(id, projectId);
  }

  @Post(':id/duplicate')
  @RequireCapability(Capability.ContentCreate)
  @ApiOperation({
    summary: 'Duplicate a content',
    description:
      "Duplicate into a new content (copies the edited version's steps / config / data).",
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Content ID to duplicate' })
  @ApiResponse({ status: 201, description: 'Duplicated content', type: ContentDto })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async duplicate(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Body() body: DuplicateContentBodyDto,
  ) {
    return this.service.duplicate(id, projectId, body);
  }

  @Put(':id/environments/:environmentId')
  @RequireCapability(Capability.ContentPublish)
  @ApiOperation({
    summary: 'Publish a version',
    description: "Publish a version as this environment's live version (idempotent).",
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiResponse({ status: 200, description: 'Published; returns the content', type: ContentDto })
  @ApiResponse({ status: 404, description: 'Content or version not found' })
  async publish(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @EnvironmentDecorator() environment: Environment,
    @Body() body: PublishContentBodyDto,
  ) {
    return this.service.publish(id, projectId, environment.id, body.versionId);
  }

  @Delete(':id/environments/:environmentId')
  @RequireCapability(Capability.ContentPublish)
  @ApiOperation({
    summary: 'Unpublish a content',
    description: "Clear this environment's live version for the content.",
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiResponse({ status: 200, description: 'Unpublished; returns the content', type: ContentDto })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async unpublish(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @EnvironmentDecorator() environment: Environment,
  ) {
    return this.service.unpublish(id, projectId, environment.id);
  }
}
