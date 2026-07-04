import {
  Controller,
  Get,
  Param,
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
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';

import { ApiValidationPipe } from '../shared/validation.pipe';
import {
  AnalyticsQueryDto,
  ContentAnalyticsDto,
  QuestionAnalyticsResponseDto,
} from './analytics.schema';
import { ApiAnalyticsService } from './analytics.service';

/** Content analytics — read-only aggregates over an environment's sessions (analytics:read). */
@ApiTags('Analytics')
@Controller('v2/projects/:projectId/content/:id/analytics')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiAnalyticsController {
  constructor(
    private readonly service: ApiAnalyticsService,
    private readonly auth: ApiTokenAuthService,
  ) {}

  /** The environment arrives as a QUERY param, so the guard's path-param
   *  env-scope check never runs — assert the token's env scope here. */
  private assertEnvScope(req: { apiToken: AuthedApiToken }, environmentId: string): void {
    this.auth.assertEnvironmentInScope(req.apiToken, { id: environmentId });
  }

  @Get()
  @RequireCapability(Capability.AnalyticsRead)
  @ApiOperation({
    summary: 'Get content analytics',
    description:
      'Views / completions (unique + total), a per-day series, and the per-type breakdown: ' +
      'per-step funnel with tooltip-target-missing counts (flows), per-task completion ' +
      '(checklists), per-block clicks (resource centers). Defaults to the last 30 days, UTC.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({ status: 200, description: 'Content analytics', type: ContentAnalyticsDto })
  @ApiResponse({ status: 404, description: 'Content or environment not found' })
  async contentAnalytics(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Query() query: AnalyticsQueryDto,
    @Req() req: { apiToken: AuthedApiToken },
  ) {
    this.assertEnvScope(req, query.environmentId);
    return this.service.contentAnalytics(id, projectId, query);
  }

  @Get('questions')
  @RequireCapability(Capability.AnalyticsRead)
  @ApiOperation({
    summary: 'Get question analytics',
    description:
      'Per-question aggregates for survey questions in this content: answer distribution, ' +
      'NPS score with promoter/passive/detractor shares, rating averages — each with a ' +
      'rolling-window daily series. Defaults to the last 30 days, UTC.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({
    status: 200,
    description: 'Question analytics',
    type: QuestionAnalyticsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Content or environment not found' })
  async questionAnalytics(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Query() query: AnalyticsQueryDto,
    @Req() req: { apiToken: AuthedApiToken },
  ) {
    this.assertEnvScope(req, query.environmentId);
    return this.service.questionAnalytics(id, projectId, query);
  }
}
