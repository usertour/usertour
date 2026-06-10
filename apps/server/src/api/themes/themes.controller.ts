import { Controller, Get, Param, UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';

import { ApiValidationPipe } from '../shared/validation.pipe';
import { ApiThemesService } from './themes.service';
import { ListThemesResponseDto, ThemeDto } from './themes.schema';

@ApiTags('Themes')
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
  async list(@Param('projectId') projectId: string) {
    return this.service.list(projectId);
  }

  @Get(':id')
  @RequireCapability(Capability.ThemeRead)
  @ApiOperation({ summary: 'Get a theme' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Theme ID' })
  @ApiResponse({ status: 200, description: 'Theme found', type: ThemeDto })
  @ApiResponse({ status: 404, description: 'Theme not found' })
  async get(@Param('id') id: string, @Param('projectId') projectId: string) {
    return this.service.get(id, projectId);
  }
}
