import { Injectable } from '@nestjs/common';

import { AttributesService } from '@/attributes/attributes.service';
import {
  AttributeDefinitionNotFoundError,
  InvalidScopeError,
  ResourceAlreadyExistsError,
  ResourceConflictError,
  ValidationError,
} from '@/common/errors/errors';

import {
  ApiObjectType,
  isApiObjectType,
  mapDataTypeToInternal,
  mapScopeToBizType,
} from '../shared/object-type';
import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import { mapAttribute } from './attribute-definitions.mapper';
import {
  Attribute,
  CreateAttributeBody,
  ListAttributeDefinitionsQuery,
  UpdateAttributeBody,
} from './attribute-definitions.schema';

/** Coerce a single-or-array query param to an array (or undefined). */
function toArray(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value : [value];
}

/**
 * v2 attribute-definitions handler. The Prisma->API mapping below is intentionally
 * identical to the v1 facade so the external JSON is byte-for-byte the same
 * (asserted by the v1<->v2 parity e2e). Depends on the domain {@link AttributesService}.
 */
@Injectable()
export class ApiAttributeDefinitionsService {
  constructor(private readonly attributes: AttributesService) {}

  async list(
    requestUrl: string,
    projectId: string,
    query: ListAttributeDefinitionsQuery,
  ): Promise<{ results: Attribute[]; next: string | null; previous: string | null }> {
    const { limit, cursor, scope, orderBy, eventName } = query;

    if (scope && !isApiObjectType(scope)) {
      throw new InvalidScopeError(scope);
    }

    const bizType = scope ? mapScopeToBizType(scope as ApiObjectType) : undefined;
    const sortOrders = parseOrderBy(toArray(orderBy) || ['displayName']);

    return paginate({
      requestUrl,
      cursor,
      limit,
      fetch: (params) =>
        this.attributes.listWithPagination(
          projectId,
          params,
          bizType,
          toArray(eventName),
          sortOrders,
        ),
      map: mapAttribute,
    });
  }

  /** Get a single attribute definition (404 when missing or owned by another project). */
  async get(id: string, projectId: string): Promise<Attribute> {
    return mapAttribute(await this.requireExisting(id, projectId));
  }

  /** Create an attribute definition. Duplicate (project+scope+codeName) → 409. */
  async create(projectId: string, body: CreateAttributeBody): Promise<Attribute> {
    try {
      const created = await this.attributes.create({
        projectId,
        bizType: mapScopeToBizType(body.scope as ApiObjectType),
        dataType: mapDataTypeToInternal(body.dataType),
        codeName: body.codeName,
        displayName: body.displayName,
        description: body.description ?? '',
      });
      return mapAttribute(created);
    } catch (err) {
      // The domain raises a generic (non-OpenAPI) ResourceAlreadyExistsError on
      // the (projectId, bizType, codeName) unique violation — surface it as a
      // clean 409 instead of a 500.
      if (err instanceof ResourceAlreadyExistsError) {
        throw new ResourceConflictError();
      }
      throw err;
    }
  }

  /** Update the human-facing fields of an attribute (dataType/scope/codeName are fixed). */
  async update(id: string, projectId: string, body: UpdateAttributeBody): Promise<Attribute> {
    await this.requireWritable(id, projectId);
    const updated = await this.attributes.update({
      id,
      ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
    });
    return mapAttribute(updated);
  }

  /** Delete an attribute definition. */
  async delete(id: string, projectId: string): Promise<void> {
    await this.requireWritable(id, projectId);
    await this.attributes.delete(id);
  }

  /**
   * Resolve an attribute that belongs to this project and is safe to mutate.
   * 404s when missing or owned by another project (no cross-project leak);
   * rejects predefined/system attributes.
   */
  private async requireWritable(id: string, projectId: string) {
    const attr = await this.requireExisting(id, projectId);
    if (attr.predefined) {
      throw new ValidationError('Cannot modify a predefined attribute definition.');
    }
    return attr;
  }

  /** Resolve an attribute that belongs to this project, or 404 (no cross-project leak). */
  private async requireExisting(id: string, projectId: string) {
    const attr = await this.attributes.get(id);
    if (!attr || attr.projectId !== projectId) {
      throw new AttributeDefinitionNotFoundError();
    }
    return attr;
  }
}
