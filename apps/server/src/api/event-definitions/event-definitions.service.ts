import { Injectable } from '@nestjs/common';

import {
  EventDefinitionNotFoundError,
  ResourceAlreadyExistsError,
  ResourceConflictError,
  ValidationError,
} from '@/common/errors/errors';
import { EventsService } from '@/events/events.service';

import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import { mapEventDefinition } from './event-definitions.mapper';
import {
  CreateEventDefinitionBody,
  EventDefinition,
  ListEventDefinitionsQuery,
  UpdateEventDefinitionBody,
} from './event-definitions.schema';

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
    const { cursor, limit, name } = query;
    const sortOrders = parseOrderBy(query.orderBy, ['createdAt']);

    return paginate({
      requestUrl,
      cursor,
      limit,
      fetch: (params) => this.events.listWithPagination(projectId, params, sortOrders, name),
      map: mapEventDefinition,
    });
  }

  /** Get a single event definition (404 when missing or owned by another project). */
  async get(id: string, projectId: string): Promise<EventDefinition> {
    return mapEventDefinition(await this.requireExisting(id, projectId));
  }

  /** Create an event definition. Duplicate (project+codeName) → 409. */
  async create(projectId: string, body: CreateEventDefinitionBody): Promise<EventDefinition> {
    try {
      const created = await this.events.create({
        projectId,
        codeName: body.codeName,
        displayName: body.displayName,
        description: body.description ?? '',
        // The domain create rewrites the event's attribute links from this list;
        // a new event has none. (Event<->attribute management is out of scope.)
        attributeIds: [],
      });
      return mapEventDefinition(created);
    } catch (err) {
      if (err instanceof ResourceAlreadyExistsError) {
        throw new ResourceConflictError();
      }
      throw err;
    }
  }

  /** Update the human-facing fields (codeName is fixed; attribute links untouched). */
  async update(
    id: string,
    projectId: string,
    body: UpdateEventDefinitionBody,
  ): Promise<EventDefinition> {
    await this.requireWritable(id, projectId);
    const updated = await this.events.updateInfo(id, {
      ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
    });
    return mapEventDefinition(updated);
  }

  /** Delete an event definition. */
  async delete(id: string, projectId: string): Promise<void> {
    await this.requireWritable(id, projectId);
    await this.events.delete(id);
  }

  /**
   * Resolve an event that belongs to this project and is safe to mutate. 404s
   * when missing or owned by another project; rejects predefined/system events.
   */
  private async requireWritable(id: string, projectId: string) {
    const event = await this.requireExisting(id, projectId);
    if (event.predefined) {
      throw new ValidationError('Cannot modify a predefined event definition.');
    }
    return event;
  }

  /** Resolve an event that belongs to this project, or 404 (no cross-project leak). */
  private async requireExisting(id: string, projectId: string) {
    const event = await this.events.get(id);
    if (!event || event.projectId !== projectId) {
      throw new EventDefinitionNotFoundError();
    }
    return event;
  }
}
