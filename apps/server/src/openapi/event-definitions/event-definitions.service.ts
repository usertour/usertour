import { Injectable, Logger } from '@nestjs/common';
import { EventDefinition } from '../models/event-definition.model';
import { InvalidLimitError } from '@/common/errors/errors';
import { EventsService as BusinessEventsService } from '@/events/events.service';
import { OpenApiObjectType } from '@/common/openapi/types';
import { ConfigService } from '@nestjs/config';
import { paginate } from '@/common/openapi/pagination';
import { Environment } from '@/environments/models/environment.model';
@Injectable()
export class OpenAPIEventDefinitionsService {
  private readonly logger = new Logger(OpenAPIEventDefinitionsService.name);

  constructor(
    private readonly businessEventsService: BusinessEventsService,
    private readonly configService: ConfigService,
  ) {}

  async listEventDefinitions(
    requestUrl: string,
    environment: Environment,
    limit = 20,
    cursor?: string,
  ): Promise<{ results: EventDefinition[]; next: string | null; previous: string | null }> {
    // Validate limit
    if (limit < 1) {
      throw new InvalidLimitError();
    }
    const projectId = environment.projectId;

    return paginate(
      requestUrl,
      cursor,
      limit,
      async (params) => await this.businessEventsService.listWithPagination(projectId, params),
      (node) => ({
        id: node.id,
        object: OpenApiObjectType.EVENT_DEFINITION,
        createdAt: new Date(node.createdAt).toISOString(),
        description: node.description,
        displayName: node.displayName,
        name: node.codeName,
      }),
    );
  }
}
