import { Injectable, Logger } from '@nestjs/common';
import { Event } from '../models/event.model';
import { OpenAPIException } from '@/common/exceptions/openapi.exception';
import { OpenAPIErrors } from '../constants/errors';
import { HttpStatus } from '@nestjs/common';
import { EventsService as BusinessEventsService } from '@/events/events.service';

@Injectable()
export class OpenAPIEventsService {
  private readonly logger = new Logger(OpenAPIEventsService.name);

  constructor(private readonly businessEventsService: BusinessEventsService) {}

  async listEvents(
    projectId: string,
    cursor?: string,
    limit?: number,
  ): Promise<{ results: Event[]; next: string | null; previous: string | null }> {
    this.logger.log(`Listing events for project ${projectId}`);

    // Validate limit
    const pageSize = Number(limit) || 20;
    if (Number.isNaN(pageSize) || pageSize < 1) {
      throw new OpenAPIException(
        OpenAPIErrors.USER.INVALID_LIMIT.message,
        HttpStatus.BAD_REQUEST,
        OpenAPIErrors.USER.INVALID_LIMIT.code,
      );
    }

    const result = await this.businessEventsService.listWithPagination(projectId, cursor, pageSize);

    return {
      results: result.edges.map((edge) => ({
        id: edge.node.id,
        object: 'event_definition',
        createdAt: edge.node.createdAt.toISOString(),
        description: edge.node.description,
        displayName: edge.node.displayName,
        name: edge.node.codeName,
      })),
      next: result.pageInfo.hasNextPage ? result.pageInfo.endCursor : null,
      previous: result.pageInfo.hasPreviousPage ? result.pageInfo.startCursor : null,
    };
  }
}
