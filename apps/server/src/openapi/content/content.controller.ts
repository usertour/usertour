import { Controller, Get, Param, Query, UseFilters, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OpenAPIExceptionFilter } from '../filters/openapi-exception.filter';
import { OpenAPIContentService } from './content.service';
import { Content, ContentVersion } from '../models/content.model';
import { EnvironmentId } from '../decorators/environment-id.decorator';
import { ExpandType } from './content.dto';
import { OpenapiGuard } from '../openapi.guard';

@ApiTags('Contents')
@Controller('v1')
@UseGuards(OpenapiGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class OpenAPIContentController {
  constructor(private readonly openAPIContentService: OpenAPIContentService) {}

  @Get('contents/:id')
  @ApiOperation({ summary: 'Get a content by ID' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiQuery({ name: 'expand', required: false, enum: ExpandType, isArray: true })
  @ApiResponse({ status: 200, description: 'Content found', type: Content })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async getContent(
    @Param('id') id: string,
    @EnvironmentId() environmentId: string,
    @Query('expand') expand?: string,
  ): Promise<Content> {
    const expandTypes = expand ? expand.split(',').map((e) => e.trim() as ExpandType) : undefined;
    return this.openAPIContentService.getContent(id, environmentId, expandTypes);
  }

  @Get('contents')
  @ApiOperation({ summary: 'List all contents' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  @ApiQuery({ name: 'expand', required: false, enum: ExpandType, isArray: true })
  @ApiResponse({ status: 200, description: 'List of contents', type: Content, isArray: true })
  async listContents(
    @EnvironmentId() environmentId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
    @Query('expand') expand?: string,
  ): Promise<{ results: Content[]; next: string | null; previous: string | null }> {
    const expandTypes = expand ? expand.split(',').map((e) => e.trim() as ExpandType) : undefined;
    return this.openAPIContentService.listContents(environmentId, cursor, limit, expandTypes);
  }

  @Get('content_versions/:id')
  @ApiOperation({ summary: 'Get a content version by ID' })
  @ApiParam({ name: 'id', description: 'Content version ID' })
  @ApiResponse({ status: 200, description: 'Content version found', type: ContentVersion })
  @ApiResponse({ status: 404, description: 'Content version not found' })
  async getContentVersion(
    @Param('id') id: string,
    @EnvironmentId() environmentId: string,
  ): Promise<ContentVersion> {
    return this.openAPIContentService.getContentVersion(id, environmentId);
  }

  @Get('content_versions')
  @ApiOperation({ summary: 'List all content versions' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor for pagination' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'List of content versions' })
  async listContentVersions(
    @EnvironmentId() environmentId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ): Promise<{ results: ContentVersion[]; next: string | null; previous: string | null }> {
    return this.openAPIContentService.listContentVersions(environmentId, cursor, limit);
  }
}
