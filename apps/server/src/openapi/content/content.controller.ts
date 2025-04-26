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
import { ContentService } from './content.service';
import { Content } from '../models/content.model';
import { EnvironmentId } from '../decorators/environment-id.decorator';
import { ExpandType } from './content.dto';
import { OpenapiGuard } from '../openapi.guard';

@ApiTags('Contents')
@Controller('v1/contents')
@UseGuards(OpenapiGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get(':id')
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
    return this.contentService.getContent(id, environmentId, expandTypes);
  }

  @Get()
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
    return this.contentService.listContents(environmentId, cursor, limit, expandTypes);
  }
}
