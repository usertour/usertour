import { Injectable } from '@nestjs/common';

import { AttributesService } from '@/attributes/attributes.service';
import { InvalidScopeError } from '@/common/errors/errors';

import {
  ApiObjectType,
  isApiObjectType,
  mapBizTypeToScope,
  mapDataType,
  mapScopeToBizType,
} from '../shared/object-type';
import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import { Attribute, ListAttributeDefinitionsQuery } from './attribute-definitions.schema';

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
      map: (node) => ({
        id: node.id,
        object: ApiObjectType.ATTRIBUTE_DEFINITION,
        createdAt:
          typeof node.createdAt === 'string' ? node.createdAt : node.createdAt.toISOString(),
        dataType: mapDataType(node.dataType),
        description: node.description,
        displayName: node.displayName,
        codeName: node.codeName,
        scope: mapBizTypeToScope(node.bizType),
      }),
    });
  }
}
