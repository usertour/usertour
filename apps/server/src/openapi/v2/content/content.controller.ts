import { Controller, Get, Param, Query, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';

import {
  GetContentQueryDto,
  GetContentVersionQueryDto,
  ListContentQueryDto,
  ListContentVersionsQueryDto,
} from '../../services/content/content.dto';
import { OpenAPIContentService } from '../../services/content/content.service';
import { ContentV2, ContentVersion } from '../../models/content.model';

@ApiTags('Content (v2)')
@Controller('v2/projects/:projectId')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class OpenAPIV2ContentController {
  constructor(private readonly openAPIContentService: OpenAPIContentService) {}

  @Get('content')
  @RequireCapability(Capability.ContentRead)
  @ApiOperation({ summary: 'List all content' })
  @ApiResponse({ status: 200, description: 'List of content', type: ContentV2, isArray: true })
  async listContent(
    @RequestUrl() requestUrl: string,
    @Param('projectId') projectId: string,
    @Query() query: ListContentQueryDto,
  ): Promise<{ results: ContentV2[]; next: string | null; previous: string | null }> {
    return this.openAPIContentService.listContentV2(requestUrl, projectId, query);
  }

  @Get('content/:id')
  @RequireCapability(Capability.ContentRead)
  @ApiOperation({ summary: 'Get a content by ID' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({ status: 200, description: 'Content found', type: ContentV2 })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async getContent(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Query() query: GetContentQueryDto,
  ): Promise<ContentV2> {
    return this.openAPIContentService.getContentV2(id, projectId, query);
  }

  @Get('content-versions')
  @RequireCapability(Capability.ContentRead)
  @ApiOperation({ summary: 'List all content versions' })
  @ApiResponse({ status: 200, description: 'List of content versions' })
  async listContentVersions(
    @RequestUrl() requestUrl: string,
    @Param('projectId') projectId: string,
    @Query() query: ListContentVersionsQueryDto,
  ): Promise<{ results: ContentVersion[]; next: string | null; previous: string | null }> {
    return this.openAPIContentService.listContentVersions(requestUrl, projectId, query);
  }

  @Get('content-versions/:id')
  @RequireCapability(Capability.ContentRead)
  @ApiOperation({ summary: 'Get a content version by ID' })
  @ApiParam({ name: 'id', description: 'Content version ID' })
  @ApiResponse({ status: 200, description: 'Content version found', type: ContentVersion })
  @ApiResponse({ status: 404, description: 'Content version not found' })
  async getContentVersion(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Query() query: GetContentVersionQueryDto,
  ): Promise<ContentVersion> {
    return this.openAPIContentService.getContentVersion(id, projectId, query);
  }
}
