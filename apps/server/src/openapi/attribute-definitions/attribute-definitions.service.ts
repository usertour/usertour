import { Injectable } from '@nestjs/common';
import { AttributesService } from '@/attributes/attributes.service';
import {
  mapBizType,
  mapDataType,
  mapOpenApiObjectTypeToBizType,
  OpenApiObjectType,
  isValidOpenApiObjectType,
} from '@/common/openapi/types';
import { Attribute } from '@/openapi/models/attribute.model';
import { ConfigService } from '@nestjs/config';
import { paginate } from '@/common/openapi/pagination';
import { parseOrderBy } from '@/common/openapi/sort';
import { InvalidScopeError } from '@/common/errors/errors';

@Injectable()
export class OpenAPIAttributeDefinitionsService {
  constructor(
    private readonly attributesService: AttributesService,
    private readonly configService: ConfigService,
  ) {}

  async listAttributeDefinitions(
    projectId: string,
    limit: number,
    scope: OpenApiObjectType,
    cursor: string,
    orderBy: string[],
    eventName: string[],
  ) {
    const apiUrl = this.configService.get<string>('app.apiUrl');
    const endpointUrl = `${apiUrl}/v1/attribute-definitions`;

    if (scope && !isValidOpenApiObjectType(scope)) {
      throw new InvalidScopeError(scope);
    }

    const sortOrders = parseOrderBy(orderBy);
    const bizType = scope ? mapOpenApiObjectTypeToBizType(scope) : undefined;
    const queryParams = { ...(scope ? { scope } : {}), ...(eventName ? { eventName } : {}) };

    return paginate(
      endpointUrl,
      cursor,
      limit,
      async (params) =>
        this.attributesService.listWithPagination(
          projectId,
          params,
          bizType,
          eventName,
          sortOrders,
        ),
      (node) => this.mapToAttribute(node),
      queryParams,
    );
  }

  private mapToAttribute(attribute: any): Attribute {
    return {
      id: attribute.id,
      object: OpenApiObjectType.ATTRIBUTE_DEFINITION,
      createdAt:
        typeof attribute.createdAt === 'string'
          ? attribute.createdAt
          : attribute.createdAt.toISOString(),
      dataType: mapDataType(attribute.dataType),
      description: attribute.description,
      displayName: attribute.displayName,
      codeName: attribute.codeName,
      scope: mapBizType(attribute.bizType),
    };
  }
}
