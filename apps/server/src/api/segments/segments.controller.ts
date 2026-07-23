import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseFilters,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiStandardErrorResponses, ErrorResponseDto } from '../shared/error-response';
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { EnvironmentDecorator } from '@/common/decorators/environment.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { Environment } from '@/environments/models/environment.model';

import { ApiValidationPipe } from '../shared/validation.pipe';
import { ApiSegmentsService } from './segments.service';
import {
  CreateSegmentBodyDto,
  ListSegmentsQueryDto,
  ListSegmentsResponseDto,
  SegmentDto,
  UpdateSegmentBodyDto,
} from './segments.schema';

/** Segment definitions — project-level (the segment's env column is legacy/unused). */
@ApiTags('Segments')
@ApiStandardErrorResponses()
@Controller('v2/projects/:projectId/segments')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiSegmentsController {
  constructor(private readonly service: ApiSegmentsService) {}

  @Get()
  @RequireCapability(Capability.SegmentRead)
  @ApiOperation({ summary: 'List segments' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'List of segments', type: ListSegmentsResponseDto })
  async list(
    @RequestUrl() requestUrl: string,
    @Param('projectId') projectId: string,
    @Query() query: ListSegmentsQueryDto,
  ) {
    return this.service.list(requestUrl, projectId, query);
  }

  @Get(':id')
  @RequireCapability(Capability.SegmentRead)
  @ApiOperation({ summary: 'Get a segment' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Segment ID' })
  @ApiResponse({ status: 200, description: 'Segment found', type: SegmentDto })
  @ApiResponse({ status: 404, description: 'Segment not found', type: ErrorResponseDto })
  async get(@Param('id') id: string, @Param('projectId') projectId: string) {
    return this.service.get(id, projectId);
  }

  @Post()
  @RequireCapability(Capability.SegmentCreate)
  @ApiOperation({ summary: 'Create a segment' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Segment created', type: SegmentDto })
  async create(@Param('projectId') projectId: string, @Body() body: CreateSegmentBodyDto) {
    return this.service.create(projectId, body);
  }

  @Patch(':id')
  @RequireCapability(Capability.SegmentUpdate)
  @ApiOperation({ summary: 'Update a segment' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Segment ID' })
  @ApiResponse({ status: 200, description: 'Segment updated', type: SegmentDto })
  @ApiResponse({ status: 404, description: 'Segment not found', type: ErrorResponseDto })
  @ApiResponse({
    status: 409,
    description:
      'The built-in "all" segment cannot be modified or deleted (E1037) — create a condition ' +
      'segment for a filtered audience.',
    type: ErrorResponseDto,
  })
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() body: UpdateSegmentBodyDto,
  ) {
    return this.service.update(id, projectId, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireCapability(Capability.SegmentDelete)
  @ApiOperation({ summary: 'Delete a segment' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Segment ID' })
  @ApiResponse({ status: 204, description: 'Segment deleted' })
  @ApiResponse({ status: 404, description: 'Segment not found', type: ErrorResponseDto })
  @ApiResponse({
    status: 409,
    description:
      'The built-in "all" segment cannot be modified or deleted (E1037) — create a condition ' +
      'segment for a filtered audience.',
    type: ErrorResponseDto,
  })
  async remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    await this.service.delete(id, projectId);
  }
}

/**
 * Segment membership — env-level (members are env-scoped users/companies). Only
 * manual segments accept membership writes. The member id is a user or company
 * external id, per the segment's bizType.
 */
@ApiTags('Segments')
@ApiStandardErrorResponses()
@Controller('v2/projects/:projectId/environments/:environmentId/segments/:id/members')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiSegmentMembersController {
  constructor(private readonly service: ApiSegmentsService) {}

  @Put(':externalId')
  @RequireCapability(Capability.SegmentUpdate)
  @ApiOperation({
    summary: 'Add a member',
    description: "Add a user or company (per the segment's bizType) to a manual segment.",
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiParam({ name: 'id', description: 'Segment ID' })
  @ApiParam({
    name: 'externalId',
    description: 'User or company external ID (per segment bizType)',
  })
  @ApiResponse({ status: 204, description: 'Member added' })
  @ApiResponse({
    status: 404,
    description: 'Segment, user, or company not found',
    type: ErrorResponseDto,
  })
  @HttpCode(204)
  async add(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Param('externalId') externalId: string,
    @EnvironmentDecorator() environment: Environment,
  ) {
    await this.service.addMember(id, projectId, environment.id, externalId);
  }

  @Delete(':externalId')
  @HttpCode(204)
  @RequireCapability(Capability.SegmentUpdate)
  @ApiOperation({
    summary: 'Remove a member',
    description: "Remove a user or company (per the segment's bizType) from a manual segment.",
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiParam({ name: 'id', description: 'Segment ID' })
  @ApiParam({
    name: 'externalId',
    description: 'User or company external ID (per segment bizType)',
  })
  @ApiResponse({ status: 204, description: 'Member removed' })
  @ApiResponse({
    status: 404,
    description: 'Segment, user, or company not found',
    type: ErrorResponseDto,
  })
  async remove(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Param('externalId') externalId: string,
    @EnvironmentDecorator() environment: Environment,
  ) {
    await this.service.removeMember(id, projectId, environment.id, externalId);
  }
}
