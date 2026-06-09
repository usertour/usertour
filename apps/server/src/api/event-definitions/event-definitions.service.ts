import { Injectable } from '@nestjs/common';

import { paginate } from '@/common/openapi/pagination';
import { OpenApiObjectType } from '@/common/openapi/types';
import { parseOrderBy } from '@/common/openapi/sort';
import { EventsService } from '@/events/events.service';

import { EventDefinition, ListEventDefinitionsQuery } from './event-definitions.schema';

/**
 * v2 event-definitions handler. Depends on the domain layer ({@link EventsService})
 * — never on the legacy openapi facade — so the legacy module stays frozen and
 * deletable.
 */
@Injectable()
export class ApiEventDefinitionsService {
  constructor(private readonly events: EventsService) {}

  async list(
    requestUrl: string,
    projectId: string,
    query: ListEventDefinitionsQuery,
  ): Promise<{ results: EventDefinition[]; next: string | null; previous: string | null }> {
    const { cursor, limit } = query;
    const sortOrders = parseOrderBy(['createdAt']);

    return paginate(
      requestUrl,
      cursor,
      limit,
      (params) => this.events.listWithPagination(projectId, params, sortOrders),
      (node) => ({
        id: node.id,
        object: OpenApiObjectType.EVENT_DEFINITION,
        createdAt: new Date(node.createdAt).toISOString(),
        description: node.description,
        displayName: node.displayName,
        codeName: node.codeName,
      }),
    );
  }
}
