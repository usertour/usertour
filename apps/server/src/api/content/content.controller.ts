import { Controller, Get, Param, Query, UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';

import { ApiValidationPipe } from '../shared/validation.pipe';
import { ApiContentService } from './content.service';
import {
  ContentDto,
  GetContentQueryDto,
  ListContentQueryDto,
  ListContentResponseDto,
} from './content.schema';

@ApiTags('Content (v2)')
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
  @ApiOperation({ summary: 'Get content by ID' })
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
}
