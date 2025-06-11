import { Controller, Get, Param, Query, Delete, UseFilters, UseGuards, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { OpenAPIContentSessionsService } from './content-sessions.service';
import {
  ContentSessionsOutput,
  GetContentSessionQueryDto,
  ListContentSessionsQueryDto,
} from './content-sessions.dto';
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
  @ApiResponse({ status: 200, description: 'Content session found', type: ContentSession })
  @ApiResponse({ status: 404, description: 'Content session not found' })
  async getContentSession(
    @Param('id') id: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: GetContentSessionQueryDto,
  ): Promise<ContentSession> {
    return await this.openAPIContentSessionsService.getContentSession(id, environment, query);
  }

  @Get()
  @ApiOperation({ summary: 'List all content sessions' })
  @ApiResponse({
    status: 200,
    description: 'List of content sessions',
    type: ContentSessionsOutput,
  })
  async listContentSessions(
    @RequestUrl() requestUrl: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: ListContentSessionsQueryDto,
  ): Promise<ContentSessionsOutput> {
    return this.openAPIContentSessionsService.listContentSessions(requestUrl, environment, query);
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
    @EnvironmentDecorator() environment: Environment,
  ): Promise<ContentSession> {
    return await this.openAPIContentSessionsService.endContentSession(id, environment);
  }
}
