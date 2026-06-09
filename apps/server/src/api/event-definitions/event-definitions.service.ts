import { Injectable } from '@nestjs/common';

import { EventsService } from '@/events/events.service';

import { ApiObjectType } from '../shared/object-type';
import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
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

    return paginate({
      requestUrl,
      cursor,
      limit,
      fetch: (params) => this.events.listWithPagination(projectId, params, sortOrders),
      map: (node) => ({
        id: node.id,
        object: ApiObjectType.EVENT_DEFINITION,
        createdAt: new Date(node.createdAt).toISOString(),
        description: node.description,
        displayName: node.displayName,
        codeName: node.codeName,
      }),
    });
  }
}
