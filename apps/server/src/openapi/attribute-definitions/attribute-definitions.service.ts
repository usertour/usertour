import { Injectable } from '@nestjs/common';
import { AttributesService } from '@/attributes/attributes.service';
import { ListAttributesDto } from './attribute-definitions.dto';
import {
  mapBizType,
  mapDataType,
  mapOpenApiObjectTypeToBizType,
  OpenApiObjectType,
} from '@/common/openapi/types';
import { Attribute } from '@/openapi/models/attribute.model';
import { ConfigService } from '@nestjs/config';
import { paginate } from '@/common/openapi/pagination';
import { parseOrderBy } from '@/common/openapi/sort';

@Injectable()
export class OpenAPIAttributeDefinitionsService {
  constructor(
    private readonly attributesService: AttributesService,
    private readonly configService: ConfigService,
  ) {}

  async listAttributeDefinitions(projectId: string, dto: ListAttributesDto) {
    const { cursor, limit = 20, scope, orderBy } = dto;
    const apiUrl = this.configService.get<string>('app.apiUrl');
    const endpointUrl = `${apiUrl}/v1/attribute-definitions`;

    const sortOrders = parseOrderBy(orderBy);
    const bizType = scope ? mapOpenApiObjectTypeToBizType(scope) : undefined;

    return paginate(
      endpointUrl,
      cursor,
      limit,
      async (params) =>
        this.attributesService.listWithPagination(projectId, params, bizType, sortOrders),
      (node) => this.mapToAttribute(node),
      scope ? { scope } : {},
    );
  }

  private mapToAttribute(attribute: any): Attribute {
    return {
      id: attribute.id,
      object: OpenApiObjectType.ATTRIBUTE_DEFINITION,
      createdAt: attribute.createdAt.toISOString(),
      dataType: mapDataType(attribute.dataType),
      description: attribute.description,
      displayName: attribute.displayName,
      codeName: attribute.codeName,
      scope: mapBizType(attribute.bizType),
    };
  }
}
