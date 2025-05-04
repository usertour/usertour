import {
  Controller,
  Get,
  Param,
  Query,
  Delete,
  UseFilters,
  UseGuards,
  DefaultValuePipe,
  ParseArrayPipe,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { OpenAPIContentSessionsService } from './content-sessions.service';
import { ContentSessionsOutput, ExpandType, OrderByType } from './content-sessions.dto';
import { OpenAPIKeyGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { EnvironmentId } from '@/common/decorators/environment-id.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { Environment } from '@/environments/models/environment.model';
import { EnvironmentDecorator } from '@/common/decorators/environment.decorator';
import { ContentSession } from '../models/content-session.model';

@ApiTags('Content Sessions')
@Controller('v1/content-sessions')
@UseGuards(OpenAPIKeyGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class OpenAPIContentSessionsController {
  constructor(private readonly openAPIContentSessionsService: OpenAPIContentSessionsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a content session by ID' })
  @ApiParam({ name: 'id', description: 'Content Session ID' })
  @ApiQuery({ name: 'expand', required: false, enum: ExpandType, isArray: true })
  @ApiResponse({ status: 200, description: 'Content session found', type: ContentSession })
  @ApiResponse({ status: 404, description: 'Content session not found' })
  async getContentSession(
    @Param('id') id: string,
    @EnvironmentId() environmentId: string,
    @Query('expand', new ParseArrayPipe({ optional: true, items: String })) expand?: ExpandType[],
  ): Promise<ContentSession> {
    return await this.openAPIContentSessionsService.getContentSession(id, environmentId, expand);
  }

  @Get()
  @ApiOperation({ summary: 'List all content sessions' })
  @ApiQuery({ name: 'contentId', required: true, description: 'Content ID' })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID to filter sessions' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor for pagination' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  @ApiQuery({ name: 'expand', required: false, enum: ExpandType, isArray: true })
  @ApiResponse({
    status: 200,
    description: 'List of content sessions',
    type: ContentSessionsOutput,
  })
  async listContentSessions(
    @RequestUrl() requestUrl: string,
    @EnvironmentDecorator() environment: Environment,
    @Query('contentId') contentId: string,
    @Query('limit', new DefaultValuePipe(20)) limit: number,
    @Query('cursor') cursor?: string,
    @Query('userId') userId?: string,
    @Query('orderBy', new ParseArrayPipe({ optional: true, items: String }))
    orderBy?: OrderByType[],
    @Query('expand', new ParseArrayPipe({ optional: true, items: String })) expand?: ExpandType[],
  ): Promise<ContentSessionsOutput> {
    return this.openAPIContentSessionsService.listContentSessions(
      requestUrl,
      environment,
      contentId,
      limit,
      userId,
      cursor,
      expand,
      orderBy,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a content session' })
  @ApiParam({ name: 'id', description: 'Content Session ID' })
  @ApiResponse({ status: 200, description: 'Content session deleted successfully' })
  async deleteContentSession(@Param('id') id: string, @EnvironmentId() environmentId: string) {
    return this.openAPIContentSessionsService.deleteContentSession(id, environmentId);
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'End a content session' })
  @ApiParam({ name: 'id', description: 'Content Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Content session ended successfully',
    type: ContentSession,
  })
  @ApiResponse({ status: 404, description: 'Content session not found' })
  async endContentSession(
    @Param('id') id: string,
    @EnvironmentId() environmentId: string,
  ): Promise<ContentSession> {
    return await this.openAPIContentSessionsService.endContentSession(id, environmentId);
  }
}
