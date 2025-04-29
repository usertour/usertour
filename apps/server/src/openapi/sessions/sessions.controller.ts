import {
  Controller,
  Get,
  Delete,
  Query,
  Param,
  UseGuards,
  UseFilters,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OpenAPIContentSessionService } from './sessions.service';
import { ContentSessionOutput, ContentSessionsOutput, ExpandType } from './sessions.dto';
import { OpenapiGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { EnvironmentId } from '@/common/decorators/environment-id.decorator';

@ApiTags('Content Session')
@Controller('v1/content-sessions')
@UseGuards(OpenapiGuard)
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
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
    @Query('expand') expand?: string,
  ) {
    this.logger.log('listContentSessions called', {
      environmentId,
      contentId,
      cursor,
      limit,
      expand,
    });
    return this.openAPIContentSessionService.listContentSessions(
      environmentId,
      contentId,
      cursor,
      limit,
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
