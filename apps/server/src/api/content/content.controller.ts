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
  Req,
  UseFilters,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Capability } from '@usertour/types';

import { ApiTokenAuthService, type AuthedApiToken } from '@/api-token/api-token-auth.service';
import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';

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
  UnpublishContentBodyDto,
  UpdateContentBodyDto,
} from './content.schema';

@ApiTags('Content')
@Controller('v2/projects/:projectId/content')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiContentController {
  constructor(
    private readonly service: ApiContentService,
    private readonly auth: ApiTokenAuthService,
  ) {}

  /**
   * Publish/unpublish carry the target environment in the BODY (not the path), so the
   * guard's path-param environment-scope check never fires for them — enforce it here.
   * Checks the env id against the token's allowlist directly (no DB lookup): the service
   * still validates that the environment exists in the project.
   */
  private requireEnvironmentInScope(
    req: { apiToken: AuthedApiToken },
    environmentId: string,
  ): void {
    this.auth.assertEnvironmentInScope(req.apiToken, { id: environmentId });
  }

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
  @ApiOperation({ summary: 'Get content' })
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
  @ApiOperation({ summary: 'Create content' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Content created', type: ContentDto })
  async create(@Param('projectId') projectId: string, @Body() body: CreateContentBodyDto) {
    return this.service.create(projectId, body);
  }

  @Patch(':id')
  @RequireCapability(Capability.ContentUpdate)
  @ApiOperation({
    summary: 'Update content',
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
  @ApiOperation({ summary: 'Delete content' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({ status: 204, description: 'Content deleted' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async remove(@Param('id') id: string, @Param('projectId') projectId: string) {
    await this.service.remove(id, projectId);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @RequireCapability(Capability.ContentUpdate)
  @ApiOperation({
    summary: 'Restore deleted content',
    description:
      'Restore soft-deleted content (find it via GET /content?deleted=true). It returns as an ' +
      'unpublished draft with versions and history intact — publish again explicitly to go live. ' +
      'Idempotent on content that is not deleted.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({ status: 200, description: 'Restored content', type: ContentDto })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async restore(@Param('id') id: string, @Param('projectId') projectId: string) {
    return this.service.restore(id, projectId);
  }

  @Post(':id/duplicate')
  @RequireCapability(Capability.ContentCreate)
  @ApiOperation({
    summary: 'Duplicate content',
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

  @Post(':id/publish')
  @HttpCode(200)
  @RequireCapability(Capability.ContentPublish)
  @ApiOperation({
    summary: 'Publish a version',
    description: 'Set a version as the live version in an environment (idempotent).',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({ status: 200, description: 'Published; returns the content', type: ContentDto })
  @ApiResponse({ status: 404, description: 'Content or version not found' })
  async publish(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Body() body: PublishContentBodyDto,
    @Req() req: { apiToken: AuthedApiToken },
  ) {
    this.requireEnvironmentInScope(req, body.environmentId);
    return this.service.publish(id, projectId, body.environmentId, body.versionId, {
      userId: req.apiToken.userId,
      tokenId: req.apiToken.id,
    });
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @RequireCapability(Capability.ContentPublish)
  @ApiOperation({
    summary: 'Unpublish a version',
    description: "Clear an environment's live version for the content.",
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({ status: 200, description: 'Unpublished; returns the content', type: ContentDto })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async unpublish(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Body() body: UnpublishContentBodyDto,
    @Req() req: { apiToken: AuthedApiToken },
  ) {
    this.requireEnvironmentInScope(req, body.environmentId);
    return this.service.unpublish(id, projectId, body.environmentId, {
      userId: req.apiToken.userId,
      tokenId: req.apiToken.id,
    });
  }
}
