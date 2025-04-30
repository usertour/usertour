import {
  Get,
  Param,
  Query,
  UseFilters,
  UseGuards,
  DefaultValuePipe,
  Controller,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { OpenAPIContentsService } from './contents.service';
import { Content, ContentVersion } from '../models/content.model';
import { EnvironmentId } from '@/common/decorators/environment-id.decorator';
import { ExpandType } from './contents.dto';
import { OpenAPIKeyGuard } from '../openapi.guard';

@ApiTags('Contents')
@Controller()
@UseGuards(OpenAPIKeyGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class OpenAPIContentsController {
  constructor(private readonly openAPIContentsService: OpenAPIContentsService) {}

  @Get('v1/contents/:id')
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
    return this.openAPIContentsService.getContent(id, environmentId, expandTypes);
  }

  @Get('v1/contents')
  @ApiOperation({ summary: 'List all contents' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor for pagination' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  @ApiQuery({ name: 'expand', required: false, enum: ExpandType, isArray: true })
  @ApiResponse({ status: 200, description: 'List of contents', type: Content, isArray: true })
  async listContents(
    @EnvironmentId() environmentId: string,
    @Query('limit', new DefaultValuePipe(20)) limit: number,
    @Query('cursor') cursor?: string,
    @Query('expand') expand?: string,
  ): Promise<{ results: Content[]; next: string | null; previous: string | null }> {
    const expandTypes = expand ? expand.split(',').map((e) => e.trim() as ExpandType) : undefined;
    return this.openAPIContentsService.listContents(environmentId, cursor, limit, expandTypes);
  }

  @Get('v1/content-versions/:id')
  @ApiOperation({ summary: 'Get a content version by ID' })
  @ApiParam({ name: 'id', description: 'Content version ID' })
  @ApiResponse({ status: 200, description: 'Content version found', type: ContentVersion })
  @ApiResponse({ status: 404, description: 'Content version not found' })
  async getContentVersion(
    @Param('id') id: string,
    @EnvironmentId() environmentId: string,
  ): Promise<ContentVersion> {
    return this.openAPIContentsService.getContentVersion(id, environmentId);
  }

  @Get('v1/content-versions')
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
    @Query('limit', new DefaultValuePipe(20)) limit: number,
    @Query('cursor') cursor?: string,
  ): Promise<{ results: ContentVersion[]; next: string | null; previous: string | null }> {
    return this.openAPIContentsService.listContentVersions(environmentId, cursor, limit);
  }
}
