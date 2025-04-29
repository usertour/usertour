import { Injectable, Logger } from '@nestjs/common';
import { Event } from '../models/event.model';
import { InvalidLimitError } from '@/common/errors/errors';
import { EventsService as BusinessEventsService } from '@/events/events.service';
import { OpenApiObjectType } from '@/common/types/openapi';

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
      throw new InvalidLimitError();
    }

    const result = await this.businessEventsService.listWithPagination(projectId, cursor, pageSize);

    return {
      results: result.edges.map((edge) => ({
        id: edge.node.id,
        object: OpenApiObjectType.EVENT,
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
