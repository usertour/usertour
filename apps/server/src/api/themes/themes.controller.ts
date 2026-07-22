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
import { ApiThemesService } from './themes.service';
import {
  CreateThemeBodyDto,
  GetThemeQueryDto,
  ListThemesQueryDto,
  ListThemesResponseDto,
  ThemeDto,
  UpdateThemeBodyDto,
} from './themes.schema';

@ApiTags('Themes')
@ApiStandardErrorResponses()
@Controller('v2/projects/:projectId/themes')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiThemesController {
  constructor(private readonly service: ApiThemesService) {}

  @Get()
  @RequireCapability(Capability.ThemeRead)
  @ApiOperation({ summary: 'List themes' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'List of themes', type: ListThemesResponseDto })
  async list(
    @RequestUrl() requestUrl: string,
    @Param('projectId') projectId: string,
    @Query() query: ListThemesQueryDto,
  ) {
    return this.service.list(requestUrl, projectId, query);
  }

  @Get(':id')
  @RequireCapability(Capability.ThemeRead)
  @ApiOperation({ summary: 'Get a theme' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Theme ID' })
  @ApiResponse({ status: 200, description: 'Theme found', type: ThemeDto })
  @ApiResponse({ status: 404, description: 'Theme not found', type: ErrorResponseDto })
  async get(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Query() query: GetThemeQueryDto,
  ) {
    return this.service.get(id, projectId, query);
  }

  @Post()
  @RequireCapability(Capability.ThemeCreate)
  @ApiOperation({ summary: 'Create a theme' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Theme created', type: ThemeDto })
  async create(@Param('projectId') projectId: string, @Body() body: CreateThemeBodyDto) {
    return this.service.create(projectId, body);
  }

  @Patch(':id')
  @RequireCapability(Capability.ThemeUpdate)
  @ApiOperation({ summary: 'Update a theme' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Theme ID' })
  @ApiResponse({ status: 200, description: 'Theme updated', type: ThemeDto })
  @ApiResponse({ status: 404, description: 'Theme not found', type: ErrorResponseDto })
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() body: UpdateThemeBodyDto,
  ) {
    return this.service.update(id, projectId, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireCapability(Capability.ThemeDelete)
  @ApiOperation({
    summary: 'Delete a theme',
    description:
      'Rejected for the default / system theme, and while any live or draft version still uses ' +
      'the theme (409 E1031 — switch that content to another theme first). Historical versions ' +
      'do not block deletion.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Theme ID' })
  @ApiResponse({ status: 204, description: 'Theme deleted' })
  @ApiResponse({ status: 404, description: 'Theme not found', type: ErrorResponseDto })
  @ApiResponse({
    status: 409,
    description:
      'State conflict — E1031 the theme is used by a draft or live version (the message names ' +
      'them), E1034 it is the project default (set another default first), E1035 system ' +
      'themes cannot be deleted.',
    type: ErrorResponseDto,
  })
  async remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    await this.service.delete(id, projectId);
  }
}
