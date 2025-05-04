import { Injectable, Logger } from '@nestjs/common';
import { EventDefinition } from '../models/event-definition.model';
import { InvalidLimitError, InvalidOrderByError } from '@/common/errors/errors';
import { EventsService as BusinessEventsService } from '@/events/events.service';
import { OpenApiObjectType } from '@/common/openapi/types';
import { paginate } from '@/common/openapi/pagination';
import { Environment } from '@/environments/models/environment.model';
import { EventDefinitionOrderByType } from './event-definitions.dto';
import { parseOrderBy } from '@/common/openapi/sort';
@Injectable()
export class OpenAPIEventDefinitionsService {
  private readonly logger = new Logger(OpenAPIEventDefinitionsService.name);

  constructor(private readonly businessEventsService: BusinessEventsService) {}

  async listEventDefinitions(
    requestUrl: string,
    environment: Environment,
    limit = 20,
    cursor?: string,
    orderBy?: string[],
  ): Promise<{ results: EventDefinition[]; next: string | null; previous: string | null }> {
    // Validate limit
    if (limit < 1) {
      throw new InvalidLimitError();
    }
    const projectId = environment.projectId;
    if (
      orderBy?.some((value) => {
        const field = value.startsWith('-') ? value.substring(1) : value;
        return (
          field !== EventDefinitionOrderByType.CREATED_AT &&
          field !== EventDefinitionOrderByType.DISPLAY_NAME &&
          field !== EventDefinitionOrderByType.CODE_NAME
        );
      })
    ) {
      throw new InvalidOrderByError();
    }
    const sortOrders = parseOrderBy(orderBy || ['createdAt']);

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
