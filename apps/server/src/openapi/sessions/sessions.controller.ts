import {
  Controller,
  Get,
  Delete,
  Query,
  Param,
  UseGuards,
  UseFilters,
  Logger,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OpenAPIContentSessionService } from './sessions.service';
import { ContentSessionOutput, ContentSessionsOutput, ExpandType } from './sessions.dto';
import { OpenAPIKeyGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { EnvironmentId } from '@/common/decorators/environment-id.decorator';

@ApiTags('Content Session')
@Controller('v1/content-sessions')
@UseGuards(OpenAPIKeyGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class OpenAPIContentSessionController {
  private readonly logger = new Logger(OpenAPIContentSessionController.name);

  constructor(private readonly openAPIContentSessionService: OpenAPIContentSessionService) {}

  @Get()
  @ApiOperation({ summary: 'List content sessions' })
  @ApiResponse({ status: 200, type: ContentSessionsOutput })
  async listContentSessions(
    @EnvironmentId() environmentId: string,
    @Query('contentId') contentId: string,
    @Query('limit', new DefaultValuePipe(20)) limit: number,
    @Query('cursor') cursor?: string,
    @Query('expand') expand?: string,
  ) {
    return this.openAPIContentSessionService.listContentSessions(
      environmentId,
      contentId,
      limit,
      cursor,
      expand ? expand.split(',').map((e) => e.trim() as ExpandType) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get content session by id' })
  @ApiResponse({ status: 200, type: ContentSessionOutput })
  async getContentSession(
    @Param('id') id: string,
    @EnvironmentId() environmentId: string,
    @Query('expand') expand?: string,
  ) {
    return {
      data: await this.openAPIContentSessionService.getContentSession(
        id,
        environmentId,
        expand ? expand.split(',').map((e) => e.trim() as ExpandType) : undefined,
      ),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete content session' })
  @ApiResponse({ status: 200 })
  async deleteContentSession(@Param('id') id: string, @EnvironmentId() environmentId: string) {
    return this.openAPIContentSessionService.deleteContentSession(id, environmentId);
  }
}
