import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { AttributeBizType } from '@/attributes/models/attribute.model';
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
  constructor(
    private readonly events: EventsService,
    private readonly prisma: PrismaService,
  ) {}

  async list(
    requestUrl: string,
    projectId: string,
    query: ListEventDefinitionsQuery,
  ): Promise<{ results: EventDefinition[]; next: string | null; previous: string | null }> {
    const { cursor, limit, name } = query;
    const sortOrders = parseOrderBy(query.orderBy, ['createdAt', 'codeName', 'displayName']);

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
    const attributeIds = await this.resolveAttributeIds(projectId, body.attributes ?? []);
    try {
      const created = await this.events.create({
        projectId,
        codeName: body.codeName,
        displayName: body.displayName,
        description: body.description ?? '',
        attributeIds,
      });
      // Re-read so the response carries the attached attribute codeNames.
      return mapEventDefinition((await this.events.get(created.id)) ?? created);
    } catch (err) {
      if (err instanceof ResourceAlreadyExistsError) {
        throw new ResourceConflictError();
      }
      throw err;
    }
  }

  /** Update the human-facing fields and/or replace the attached attributes (codeName is fixed). */
  async update(
    id: string,
    projectId: string,
    body: UpdateEventDefinitionBody,
  ): Promise<EventDefinition> {
    await this.requireWritable(id, projectId);
    await this.events.updateInfo(id, {
      ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
    });
    if (body.attributes !== undefined) {
      const attributeIds = await this.resolveAttributeIds(projectId, body.attributes);
      await this.events.setAttributes(id, attributeIds);
    }
    // Re-read (with attribute links) for the response.
    return mapEventDefinition(await this.requireExisting(id, projectId));
  }

  /**
   * Resolve event-attribute codeNames to attribute ids. Event attributes are
   * the EVENT-scoped attributes (bizType EVENT), where codeName is unique per
   * project — so a codeName maps to exactly one id. Unknown codeNames → E1017.
   */
  private async resolveAttributeIds(projectId: string, codeNames: string[]): Promise<string[]> {
    const unique = [...new Set(codeNames)];
    if (unique.length === 0) {
      return [];
    }
    const rows = await this.prisma.attribute.findMany({
      where: {
        projectId,
        bizType: AttributeBizType.EVENT,
        deleted: false,
        codeName: { in: unique },
      },
      select: { id: true, codeName: true },
    });
    const idByCode = new Map(rows.map((r) => [r.codeName, r.id]));
    const missing = unique.filter((code) => !idByCode.has(code));
    if (missing.length) {
      throw new ValidationError(`Unknown event attribute codeName(s): ${missing.join(', ')}`);
    }
    return unique.map((code) => idByCode.get(code) as string);
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
      throw new ValidationError('Cannot modify or delete a predefined event definition.');
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
