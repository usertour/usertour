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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';

import { ApiValidationPipe } from '../shared/validation.pipe';
import { ApiContentVersionsService } from './content-versions.service';
import {
  ContentVersionDto,
  CreateVersionBodyDto,
  GetContentVersionQueryDto,
  ListContentVersionsQueryDto,
  ListContentVersionsResponseDto,
  UpdateVersionBodyDto,
} from './content-versions.schema';

@ApiTags('Content versions (v2)')
@Controller('v2/projects/:projectId/content-versions')
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
  @ApiResponse({
    status: 200,
    description: 'List of content versions',
    type: ListContentVersionsResponseDto,
  })
  async list(
    @RequestUrl() requestUrl: string,
    @Param('projectId') projectId: string,
    @Query() query: ListContentVersionsQueryDto,
  ) {
    return this.service.list(requestUrl, projectId, query);
  }

  @Get(':id')
  @RequireCapability(Capability.ContentRead)
  @ApiOperation({ summary: 'Get a content version by ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Content version ID' })
  @ApiResponse({ status: 200, description: 'Content version found', type: ContentVersionDto })
  @ApiResponse({ status: 404, description: 'Content version not found' })
  async get(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Query() query: GetContentVersionQueryDto,
  ) {
    return this.service.get(id, projectId, query);
  }

  @Post()
  @RequireCapability(Capability.ContentUpdate)
  @ApiOperation({ summary: 'Create a draft content version (fork the edited version)' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Created content version', type: ContentVersionDto })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async create(@Param('projectId') projectId: string, @Body() body: CreateVersionBodyDto) {
    return this.service.create(projectId, body);
  }

  @Patch(':id')
  @RequireCapability(Capability.ContentUpdate)
  @ApiOperation({ summary: 'Update a draft content version (steps / rules)' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Content version ID' })
  @ApiResponse({ status: 200, description: 'Updated content version', type: ContentVersionDto })
  @ApiResponse({ status: 404, description: 'Content version not found' })
  async update(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Body() body: UpdateVersionBodyDto,
  ) {
    return this.service.update(id, projectId, body);
  }
}
