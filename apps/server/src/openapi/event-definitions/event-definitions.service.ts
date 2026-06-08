import { Injectable, Logger } from '@nestjs/common';
import { EventDefinition } from '../models/event-definition.model';
import { EventsService as BusinessEventsService } from '@/events/events.service';
import { OpenApiObjectType } from '@/common/openapi/types';
import { paginate } from '@/common/openapi/pagination';
import { EventDefinitionOrderByType, ListEventDefinitionsQueryDto } from './event-definitions.dto';
import { parseOrderBy } from '@/common/openapi/sort';
@Injectable()
export class OpenAPIEventDefinitionsService {
  private readonly logger = new Logger(OpenAPIEventDefinitionsService.name);

  constructor(private readonly businessEventsService: BusinessEventsService) {}

  async listEventDefinitions(
    requestUrl: string,
    projectId: string,
    query: ListEventDefinitionsQueryDto,
  ): Promise<{ results: EventDefinition[]; next: string | null; previous: string | null }> {
    const { cursor, limit, orderBy } = query;
    const sortOrders = parseOrderBy(orderBy || [EventDefinitionOrderByType.CREATED_AT]);

    return paginate(
      requestUrl,
      cursor,
      limit,
      async (params) =>
        await this.businessEventsService.listWithPagination(projectId, params, sortOrders),
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
