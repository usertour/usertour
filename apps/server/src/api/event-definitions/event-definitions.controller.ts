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
  UseFilters,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiStandardErrorResponses, ErrorResponseDto } from '../shared/error-response';
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';

import { ApiValidationPipe } from '../shared/validation.pipe';
import { ApiEventDefinitionsService } from './event-definitions.service';
import {
  CreateEventDefinitionBodyDto,
  EventDefinitionDto,
  ListEventDefinitionsQueryDto,
  ListEventDefinitionsResponseDto,
  UpdateEventDefinitionBodyDto,
} from './event-definitions.schema';

@ApiTags('Event definitions')
@ApiStandardErrorResponses()
@Controller('v2/projects/:projectId/event-definitions')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiEventDefinitionsController {
  constructor(private readonly service: ApiEventDefinitionsService) {}

  @Get()
  @RequireCapability(Capability.EventRead)
  @ApiOperation({ summary: 'List event definitions' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'List of event definitions',
    type: ListEventDefinitionsResponseDto,
  })
  async list(
    @RequestUrl() requestUrl: string,
    @Param('projectId') projectId: string,
    @Query() query: ListEventDefinitionsQueryDto,
  ) {
    return this.service.list(requestUrl, projectId, query);
  }

  @Get(':id')
  @RequireCapability(Capability.EventRead)
  @ApiOperation({ summary: 'Get an event definition' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Event definition ID' })
  @ApiResponse({ status: 200, description: 'Event definition found', type: EventDefinitionDto })
  @ApiResponse({ status: 404, description: 'Event definition not found', type: ErrorResponseDto })
  async get(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.service.get(id, projectId);
  }

  @Post()
  @RequireCapability(Capability.EventCreate)
  @ApiOperation({ summary: 'Create an event definition' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Event definition created', type: EventDefinitionDto })
  @ApiResponse({
    status: 409,
    description: 'An event with this codeName already exists',
    type: ErrorResponseDto,
  })
  async create(@Param('projectId') projectId: string, @Body() body: CreateEventDefinitionBodyDto) {
    return this.service.create(projectId, body);
  }

  @Patch(':id')
  @RequireCapability(Capability.EventUpdate)
  @ApiOperation({ summary: 'Update an event definition' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Event definition ID' })
  @ApiResponse({ status: 200, description: 'Event definition updated', type: EventDefinitionDto })
  @ApiResponse({ status: 404, description: 'Event definition not found', type: ErrorResponseDto })
  @ApiResponse({
    status: 409,
    description:
      'The definition is predefined (E1036) — it cannot be modified or deleted; create your ' +
      'own definition instead.',
    type: ErrorResponseDto,
  })
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() body: UpdateEventDefinitionBodyDto,
  ) {
    return this.service.update(id, projectId, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireCapability(Capability.EventDelete)
  @ApiOperation({ summary: 'Delete an event definition' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Event definition ID' })
  @ApiResponse({ status: 204, description: 'Event definition deleted' })
  @ApiResponse({ status: 404, description: 'Event definition not found', type: ErrorResponseDto })
  @ApiResponse({
    status: 409,
    description:
      'State conflict — E1030 the event already has recorded events, E1036 it is predefined; ' +
      'neither can be deleted.',
    type: ErrorResponseDto,
  })
  async remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    await this.service.delete(id, projectId);
  }
}
