import { Get, Param, Query, UseFilters, UseGuards, Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { OpenAPIContentService } from './content.service';
import { Content, ContentVersion } from '../models/content.model';
import {
  GetContentQueryDto,
  ListContentQueryDto,
  GetContentVersionQueryDto,
  ListContentVersionsQueryDto,
} from './content.dto';
import { OpenAPIKeyGuard } from '../openapi.guard';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { EnvironmentDecorator } from '@/common/decorators/environment.decorator';
import { Environment } from '@/environments/models/environment.model';

@ApiTags('Content')
@Controller()
@UseGuards(OpenAPIKeyGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class OpenAPIContentController {
  constructor(private readonly openAPIContentService: OpenAPIContentService) {}

  @Get('v1/content/:id')
  @ApiOperation({ summary: 'Get a content by ID' })
  @ApiResponse({
    status: 200,
    description: 'The content has been successfully retrieved.',
    type: Content,
  })
  @ApiResponse({ status: 404, description: 'Content not found.' })
  async getContent(
    @Param('id') id: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: GetContentQueryDto,
  ): Promise<Content> {
    return this.openAPIContentService.getContent(id, environment, query);
  }

  @Get('v1/content')
  @ApiOperation({ summary: 'List all content' })
  @ApiResponse({ status: 200, description: 'List of content', type: Content, isArray: true })
  async listContent(
    @RequestUrl() requestUrl: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: ListContentQueryDto,
  ): Promise<{ results: Content[]; next: string | null; previous: string | null }> {
    return this.openAPIContentService.listContent(requestUrl, environment, query);
  }

  @Get('v1/content-versions/:id')
  @ApiOperation({ summary: 'Get a content version by ID' })
  @ApiParam({ name: 'id', description: 'Content version ID' })
  @ApiResponse({ status: 200, description: 'Content version found', type: ContentVersion })
  @ApiResponse({ status: 404, description: 'Content version not found' })
  async getContentVersion(
    @Param('id') id: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: GetContentVersionQueryDto,
  ): Promise<ContentVersion> {
    return this.openAPIContentService.getContentVersion(id, environment, query);
  }

  @Get('v1/content-versions')
  @ApiOperation({ summary: 'List all content versions' })
  @ApiResponse({ status: 200, description: 'List of content versions' })
  async listContentVersions(
    @RequestUrl() requestUrl: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: ListContentVersionsQueryDto,
  ): Promise<{ results: ContentVersion[]; next: string | null; previous: string | null }> {
    return this.openAPIContentService.listContentVersions(requestUrl, environment, query);
  }
}
