import {
  Get,
  Param,
  Query,
  UseFilters,
  UseGuards,
  DefaultValuePipe,
  Controller,
  ParseArrayPipe,
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
import {
  ContentOrderByType,
  VersionExpandType,
  GetContentQueryDto,
  ListContentsQueryDto,
  GetContentVersionQueryDto,
} from './contents.dto';
import { OpenAPIKeyGuard } from '../openapi.guard';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { EnvironmentDecorator } from '@/common/decorators/environment.decorator';
import { Environment } from '@/environments/models/environment.model';

@ApiTags('Contents')
@Controller()
@UseGuards(OpenAPIKeyGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class OpenAPIContentsController {
  constructor(private readonly openAPIContentsService: OpenAPIContentsService) {}

  @Get('v1/contents/:id')
  @ApiOperation({ summary: 'Get a content by ID' })
  @ApiResponse({
    status: 200,
    description: 'The content has been successfully retrieved.',
    type: Content,
  })
  @ApiResponse({ status: 404, description: 'Content not found.' })
  async getContent(
    @Param('id') id: string,
    @EnvironmentId() environmentId: string,
    @Query() query: GetContentQueryDto,
  ): Promise<Content> {
    return this.openAPIContentsService.getContent(id, environmentId, query);
  }

  @Get('v1/contents')
  @ApiOperation({ summary: 'List all contents' })
  @ApiResponse({ status: 200, description: 'List of contents', type: Content, isArray: true })
  async listContents(
    @RequestUrl() requestUrl: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: ListContentsQueryDto,
  ): Promise<{ results: Content[]; next: string | null; previous: string | null }> {
    return this.openAPIContentsService.listContents(requestUrl, environment, query);
  }

  @Get('v1/content-versions/:id')
  @ApiOperation({ summary: 'Get a content version by ID' })
  @ApiParam({ name: 'id', description: 'Content version ID' })
  @ApiResponse({ status: 200, description: 'Content version found', type: ContentVersion })
  @ApiResponse({ status: 404, description: 'Content version not found' })
  async getContentVersion(
    @Param('id') id: string,
    @EnvironmentId() environmentId: string,
    @Query() query: GetContentVersionQueryDto,
  ): Promise<ContentVersion> {
    return this.openAPIContentsService.getContentVersion(id, environmentId, query);
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
  @ApiQuery({ name: 'orderBy', required: false, enum: ContentOrderByType, isArray: true })
  @ApiResponse({ status: 200, description: 'List of content versions' })
  async listContentVersions(
    @RequestUrl() requestUrl: string,
    @EnvironmentDecorator() environment: Environment,
    @Query('contentId') contentId: string,
    @Query('limit', new DefaultValuePipe(20)) limit: number,
    @Query('cursor') cursor?: string,
    @Query('expand', new ParseArrayPipe({ optional: true, items: String }))
    expand?: VersionExpandType[],
    @Query('orderBy', new ParseArrayPipe({ optional: true, items: String }))
    orderBy?: ContentOrderByType[],
  ): Promise<{ results: ContentVersion[]; next: string | null; previous: string | null }> {
    return this.openAPIContentsService.listContentVersions(
      requestUrl,
      environment,
      contentId,
      cursor,
      orderBy,
      expand,
      limit,
    );
  }
}
