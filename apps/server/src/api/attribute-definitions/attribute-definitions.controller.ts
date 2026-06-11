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
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';

import { ApiValidationPipe } from '../shared/validation.pipe';
import { ApiAttributeDefinitionsService } from './attribute-definitions.service';
import {
  AttributeDto,
  CreateAttributeBodyDto,
  ListAttributeDefinitionsQueryDto,
  ListAttributeDefinitionsResponseDto,
  UpdateAttributeBodyDto,
} from './attribute-definitions.schema';

@ApiTags('Attribute definitions')
@Controller('v2/projects/:projectId/attribute-definitions')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiAttributeDefinitionsController {
  constructor(private readonly service: ApiAttributeDefinitionsService) {}

  @Get()
  @RequireCapability(Capability.AttributeRead)
  @ApiOperation({ summary: 'List attribute definitions' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'List of attribute definitions',
    type: ListAttributeDefinitionsResponseDto,
  })
  async list(
    @RequestUrl() requestUrl: string,
    @Param('projectId') projectId: string,
    @Query() query: ListAttributeDefinitionsQueryDto,
  ) {
    return this.service.list(requestUrl, projectId, query);
  }

  @Get(':id')
  @RequireCapability(Capability.AttributeRead)
  @ApiOperation({ summary: 'Get an attribute definition' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Attribute definition ID' })
  @ApiResponse({ status: 200, description: 'Attribute definition found', type: AttributeDto })
  @ApiResponse({ status: 404, description: 'Attribute definition not found' })
  async get(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.service.get(id, projectId);
  }

  @Post()
  @RequireCapability(Capability.AttributeCreate)
  @ApiOperation({ summary: 'Create an attribute definition' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Attribute definition created', type: AttributeDto })
  @ApiResponse({ status: 409, description: 'An attribute with this codeName already exists' })
  async create(@Param('projectId') projectId: string, @Body() body: CreateAttributeBodyDto) {
    return this.service.create(projectId, body);
  }

  @Patch(':id')
  @RequireCapability(Capability.AttributeUpdate)
  @ApiOperation({ summary: 'Update an attribute definition' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Attribute definition ID' })
  @ApiResponse({ status: 200, description: 'Attribute definition updated', type: AttributeDto })
  @ApiResponse({ status: 404, description: 'Attribute definition not found' })
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() body: UpdateAttributeBodyDto,
  ) {
    return this.service.update(id, projectId, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireCapability(Capability.AttributeDelete)
  @ApiOperation({ summary: 'Delete an attribute definition' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Attribute definition ID' })
  @ApiResponse({ status: 204, description: 'Attribute definition deleted' })
  @ApiResponse({ status: 404, description: 'Attribute definition not found' })
  async remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    await this.service.delete(id, projectId);
  }
}
