import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseFilters,
  UseGuards,
  UsePipes,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiStandardErrorResponses, ErrorResponseDto } from '../shared/error-response';
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { AuthedApiToken } from '@/api-token/api-token-auth.service';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';

import { ApiValidationPipe } from '../shared/validation.pipe';
import { ApiContentVersionsService } from './content-versions.service';
import {
  ContentVersionDto,
  GetContentVersionQueryDto,
  ListContentVersionsQueryDto,
  ListContentVersionsResponseDto,
  UpdateVersionBodyDto,
  VersionUsabilityReportDto,
} from './content-versions.schema';

@ApiTags('Content versions')
@ApiStandardErrorResponses()
@Controller('v2/projects/:projectId/content/:contentId/versions')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiContentVersionsController {
  constructor(private readonly service: ApiContentVersionsService) {}

  @Get()
  @RequireCapability(Capability.ContentRead)
  @ApiOperation({ summary: 'List content versions' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'contentId', description: 'Content ID' })
  @ApiResponse({
    status: 200,
    description: 'List of content versions',
    type: ListContentVersionsResponseDto,
  })
  async list(
    @RequestUrl() requestUrl: string,
    @Param('projectId') projectId: string,
    @Param('contentId') contentId: string,
    @Query() query: ListContentVersionsQueryDto,
  ) {
    return this.service.list(requestUrl, projectId, contentId, query);
  }

  @Get(':id')
  @RequireCapability(Capability.ContentRead)
  @ApiOperation({ summary: 'Get a content version' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'contentId', description: 'Content ID' })
  @ApiParam({ name: 'id', description: 'Content version ID' })
  @ApiResponse({ status: 200, description: 'Content version found', type: ContentVersionDto })
  @ApiResponse({ status: 404, description: 'Content version not found', type: ErrorResponseDto })
  async get(
    @Param('id') id: string,
    @Param('contentId') contentId: string,
    @Param('projectId') projectId: string,
    @Query() query: GetContentVersionQueryDto,
  ) {
    return this.service.get(id, contentId, projectId, query);
  }

  @Get(':id/validate')
  @RequireCapability(Capability.ContentRead)
  @ApiOperation({
    summary: 'Validate a content version',
    description:
      'Dry-run usability check: the same rules `publish` enforces, without mutating. ' +
      'Returns errors (these block publish) and advisory warnings.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'contentId', description: 'Content ID' })
  @ApiParam({ name: 'id', description: 'Content version ID' })
  @ApiResponse({ status: 200, description: 'Usability report', type: VersionUsabilityReportDto })
  @ApiResponse({ status: 404, description: 'Content version not found', type: ErrorResponseDto })
  async validate(
    @Param('id') id: string,
    @Param('contentId') contentId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.service.validate(id, contentId, projectId);
  }

  @Post()
  @RequireCapability(Capability.ContentUpdate)
  @ApiOperation({
    summary: 'Create a content version',
    description:
      'Ensure an editable draft: returns the current edited version while it is an unpublished ' +
      'draft; forks it only when it is published (locked). A fork returns the slim version ' +
      'envelope — the copied steps/data are not inlined; read the version with `expand` to ' +
      'inspect them.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'contentId', description: 'Content ID' })
  @ApiResponse({ status: 201, description: 'Created content version', type: ContentVersionDto })
  @ApiResponse({ status: 404, description: 'Content not found', type: ErrorResponseDto })
  async create(
    @Param('projectId') projectId: string,
    @Param('contentId') contentId: string,
    @Req() req: { apiToken: AuthedApiToken },
  ) {
    return this.service.create(projectId, contentId, {
      userId: req.apiToken.userId,
      tokenId: req.apiToken.id,
    });
  }

  @Post(':id/restore')
  @RequireCapability(Capability.ContentUpdate)
  @ApiOperation({
    summary: 'Restore a content version',
    description: 'Fork a historical version forward as the new draft.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'contentId', description: 'Content ID' })
  @ApiParam({ name: 'id', description: 'Content version ID to restore' })
  @ApiResponse({ status: 201, description: 'New draft version', type: ContentVersionDto })
  @ApiResponse({ status: 404, description: 'Content version not found', type: ErrorResponseDto })
  async restore(
    @Param('id') id: string,
    @Param('contentId') contentId: string,
    @Param('projectId') projectId: string,
    @Req() req: { apiToken: AuthedApiToken },
  ) {
    return this.service.restore(id, contentId, projectId, {
      userId: req.apiToken.userId,
      tokenId: req.apiToken.id,
    });
  }

  @Patch(':id')
  @RequireCapability(Capability.ContentUpdate)
  @ApiOperation({
    summary: 'Update a content version',
    description:
      'Write steps, start/hide rules, themeId, or type-specific data to a draft version.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'contentId', description: 'Content ID' })
  @ApiParam({ name: 'id', description: 'Content version ID' })
  @ApiResponse({ status: 200, description: 'Updated content version', type: ContentVersionDto })
  @ApiResponse({ status: 404, description: 'Content version not found', type: ErrorResponseDto })
  @ApiResponse({
    status: 409,
    description:
      'E0049 the version is published (read-only — fork an editable draft first), or E0050 ' +
      'it was modified concurrently (re-read and retry).',
    type: ErrorResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Param('contentId') contentId: string,
    @Param('projectId') projectId: string,
    @Body() body: UpdateVersionBodyDto,
    @Req() req: { apiToken: AuthedApiToken },
  ) {
    return this.service.update(id, contentId, projectId, body, {
      userId: req.apiToken.userId,
      tokenId: req.apiToken.id,
    });
  }
}
