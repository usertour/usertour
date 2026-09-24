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

import { ApiTokenGuard } from '@/modules/api-token/guards/api-token.guard';
import { RequireCapability } from '@/modules/api-token/decorators/require-capability.decorator';
import { RequestUrl } from '@/modules/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/modules/common/filters/openapi-exception.filter';

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
@ApiStandardErrorResponses()
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
  @ApiResponse({
    status: 404,
    description: 'Attribute definition not found',
    type: ErrorResponseDto,
  })
  async get(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.service.get(id, projectId);
  }

  @Post()
  @RequireCapability(Capability.AttributeCreate)
  @ApiOperation({ summary: 'Create an attribute definition' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 201,
    description:
      'Attribute definition created — or, when a deleted attribute holds this scope and ' +
      'codeName, that one restored',
    type: AttributeDto,
  })
  @ApiResponse({
    status: 409,
    description:
      'An attribute with this codeName already exists (E1023), or a deleted attribute of ' +
      'another data type holds it (E1045) — restore that one or choose another codeName',
    type: ErrorResponseDto,
  })
  async create(@Param('projectId') projectId: string, @Body() body: CreateAttributeBodyDto) {
    return this.service.create(projectId, body);
  }

  @Patch(':id')
  @RequireCapability(Capability.AttributeUpdate)
  @ApiOperation({ summary: 'Update an attribute definition' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Attribute definition ID' })
  @ApiResponse({ status: 200, description: 'Attribute definition updated', type: AttributeDto })
  @ApiResponse({
    status: 404,
    description: 'Attribute definition not found',
    type: ErrorResponseDto,
  })
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
    @Body() body: UpdateAttributeBodyDto,
  ) {
    return this.service.update(id, projectId, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireCapability(Capability.AttributeDelete)
  @ApiOperation({
    summary: 'Delete an attribute definition',
    description:
      'Soft delete: the definition leaves lists and pickers but keeps resolving by id, and can ' +
      'be restored. Refused (E1042) while live or draft content, a segment or a theme uses it.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Attribute definition ID' })
  @ApiResponse({ status: 204, description: 'Attribute definition deleted' })
  @ApiResponse({
    status: 404,
    description: 'Attribute definition not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description:
      'The definition is predefined (E1036) — it cannot be modified or deleted; create your ' +
      'own definition instead. Or it is in use (E1042) by live or draft content, a segment or ' +
      'a theme — the message names them; remove it from them first.',
    type: ErrorResponseDto,
  })
  async remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    await this.service.delete(id, projectId);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @RequireCapability(Capability.AttributeUpdate)
  @ApiOperation({
    summary: 'Restore a deleted attribute definition',
    description:
      'Bring a soft-deleted attribute definition back as it was (find it via ' +
      'GET /attribute-definitions?deleted=true), so conditions that referenced it resolve ' +
      'again. Creating an attribute with the same scope and codeName restores it too. ' +
      'Idempotent on a definition that is not deleted.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Attribute definition ID' })
  @ApiResponse({ status: 200, description: 'Restored attribute definition', type: AttributeDto })
  @ApiResponse({
    status: 404,
    description: 'Attribute definition not found',
    type: ErrorResponseDto,
  })
  async restore(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.service.restore(id, projectId);
  }
}
