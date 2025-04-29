import { Injectable, Logger } from '@nestjs/common';
import { Event } from '../models/event.model';
import { InvalidLimitError } from '@/common/errors/errors';
import { EventsService as BusinessEventsService } from '@/events/events.service';
import { OpenApiObjectType } from '@/common/types/openapi';
import { ConfigService } from '@nestjs/config';
import { paginate } from '@/common/openapi/pagination';

@Injectable()
export class OpenAPIEventsService {
  private readonly logger = new Logger(OpenAPIEventsService.name);

  constructor(
    private readonly businessEventsService: BusinessEventsService,
    private readonly configService: ConfigService,
  ) {}

  async listEvents(
    projectId: string,
    limit = 20,
    cursor?: string,
  ): Promise<{ results: Event[]; next: string | null; previous: string | null }> {
    this.logger.log(`Listing events for project ${projectId}`);

    // Validate limit
    if (limit < 1) {
      throw new InvalidLimitError();
    }

    const apiUrl = this.configService.get<string>('app.apiUrl');

    return paginate(
      apiUrl,
      'events',
      projectId,
      cursor,
      limit,
      async (params) => {
        return await this.businessEventsService.listWithPagination(projectId, params);
      },
      (node) => ({
        id: node.id,
        object: OpenApiObjectType.EVENT,
        createdAt: new Date(node.createdAt).toISOString(),
        description: node.description,
        displayName: node.displayName,
        name: node.codeName,
      }),
    );
  }
}
