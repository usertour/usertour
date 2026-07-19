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
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Capability } from '@usertour/types';

import { ApiTokenAuthService, type AuthedApiToken } from '@/api-token/api-token-auth.service';
import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';

import { ApiValidationPipe } from '../shared/validation.pipe';
import { ApiEnvironmentsService } from './environments.service';
import {
  CreateEnvironmentBodyDto,
  EnvironmentDto,
  ListEnvironmentsQueryDto,
  ListEnvironmentsResponseDto,
  UpdateEnvironmentBodyDto,
} from './environments.schema';

/** Environments — project-level. Read (environment:read) + create/rename/delete (environment:manage). */
@ApiTags('Environments')
@Controller('v2/projects/:projectId/environments')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiEnvironmentsController {
  constructor(
    private readonly service: ApiEnvironmentsService,
    private readonly auth: ApiTokenAuthService,
  ) {}

  @Get()
  @RequireCapability(Capability.EnvironmentRead)
  @ApiOperation({ summary: 'List environments' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'List of environments',
    type: ListEnvironmentsResponseDto,
  })
  async list(
    @RequestUrl() requestUrl: string,
    @Param('projectId') projectId: string,
    @Query() query: ListEnvironmentsQueryDto,
    @Req() req: { apiToken: AuthedApiToken },
  ) {
    return this.service.list(requestUrl, projectId, query, this.scope(req));
  }

  @Get(':id')
  @RequireCapability(Capability.EnvironmentRead)
  @ApiOperation({ summary: 'Get an environment' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Environment ID' })
  @ApiResponse({ status: 200, description: 'Environment found', type: EnvironmentDto })
  @ApiResponse({ status: 404, description: 'Environment not found' })
  async get(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Req() req: { apiToken: AuthedApiToken },
  ) {
    await this.requireEnvironmentInScope(req, projectId, id);
    return this.service.get(id, projectId, this.scope(req));
  }

  @Post()
  @RequireCapability(Capability.EnvironmentManage)
  @ApiOperation({
    summary: 'Create an environment',
    description: 'Create an environment in the project. The first one is made primary.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Environment created', type: EnvironmentDto })
  async create(
    @Param('projectId') projectId: string,
    @Body() body: CreateEnvironmentBodyDto,
    @Req() req: { apiToken: AuthedApiToken },
  ) {
    // The service refuses creation from an allowlist-scoped token (E1032): the new
    // environment would fall outside the allowlist and be an undeletable orphan.
    // Pass the scope so a full-scope token's created env still maps `inTokenScope`
    // correctly (always true for it).
    return this.service.create(projectId, body, this.scope(req));
  }

  @Patch(':id')
  @RequireCapability(Capability.EnvironmentManage)
  @ApiOperation({ summary: 'Update an environment', description: 'Rename an environment.' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Environment ID' })
  @ApiResponse({ status: 200, description: 'Environment updated', type: EnvironmentDto })
  @ApiResponse({ status: 404, description: 'Environment not found' })
  async update(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Body() body: UpdateEnvironmentBodyDto,
    @Req() req: { apiToken: AuthedApiToken },
  ) {
    await this.requireEnvironmentInScope(req, projectId, id);
    return this.service.update(id, projectId, body, this.scope(req));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireCapability(Capability.EnvironmentManage)
  @ApiOperation({
    summary: 'Delete an environment',
    description: 'Delete an environment. The primary / last environment cannot be deleted.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Environment ID' })
  @ApiResponse({ status: 204, description: 'Environment deleted' })
  @ApiResponse({ status: 404, description: 'Environment not found' })
  async remove(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Req() req: { apiToken: AuthedApiToken },
  ) {
    await this.requireEnvironmentInScope(req, projectId, id);
    await this.service.delete(id, projectId);
  }

  /**
   * The environments item routes use `:id` (not `:environmentId`), so the guard's
   * path-param scope check never fires — enforce it here. Check EXISTENCE FIRST:
   * a non-existent id 404s (E1026) rather than masking as a scope error, because a
   * token that manages this project may legitimately learn which of its envs exist
   * (unlike env-DATA reads, where E1029-first avoids leaking foreign-env existence).
   * An env that exists but is outside the token's allowlist is then refused (E1029).
   */
  private async requireEnvironmentInScope(
    req: { apiToken: AuthedApiToken },
    projectId: string,
    environmentId: string,
  ): Promise<void> {
    await this.service.requireEnvironmentExists(environmentId, projectId);
    this.auth.assertEnvironmentInScope(req.apiToken, { id: environmentId });
  }

  /** The credential's effective environment scope (token allowlist ∩ member ceiling). */
  private scope(req: { apiToken: AuthedApiToken }): string[] | null {
    return this.auth.allowedEnvironmentIds(req.apiToken);
  }
}
