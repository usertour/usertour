import { Injectable } from '@nestjs/common';
import { AttributesService } from '@/attributes/attributes.service';
import { ListAttributesDto } from './attributes.dto';
import { InvalidLimitError } from '@/common/errors/errors';
import { OpenApiObjectType } from '@/common/types/openapi';
import { AttributeBizTypeNames, AttributeDataTypeNames } from '@/attributes/models/attribute.model';
import { Attribute } from '@/openapi/models/attribute.model';

@Injectable()
export class OpenAPIAttributesService {
  constructor(private readonly attributesService: AttributesService) {}

  async listAttributes(projectId: string, dto: ListAttributesDto) {
    const { cursor, limit = 20 } = dto;

    const pageSize = Number(limit) || 20;

    if (Number.isNaN(pageSize) || pageSize < 1) {
      throw new InvalidLimitError();
    }

    const result = await this.attributesService.listWithPagination(projectId, cursor, limit);

    return {
      results: result.edges.map((edge) => this.mapToAttribute(edge.node)),
      next: result.pageInfo.hasNextPage ? result.pageInfo.endCursor : null,
      previous: result.pageInfo.hasPreviousPage ? result.pageInfo.startCursor : null,
    };
  }

  private mapToAttribute(attribute: any): Attribute {
    return {
      id: attribute.id,
      object: OpenApiObjectType.ATTRIBUTE,
      createdAt: attribute.createdAt.toISOString(),
      dataType: this.mapDataType(attribute.dataType),
      description: attribute.description,
      displayName: attribute.displayName,
      name: attribute.codeName,
      scope: this.mapBizType(attribute.bizType),
    };
  }

  mapDataType(dataType: number): AttributeDataTypeNames {
    switch (dataType) {
      case 1:
        return AttributeDataTypeNames.Number;
      case 2:
        return AttributeDataTypeNames.String;
      case 3:
        return AttributeDataTypeNames.Boolean;
      case 4:
        return AttributeDataTypeNames.List;
      case 5:
        return AttributeDataTypeNames.DateTime;
      case 6:
        return AttributeDataTypeNames.RandomAB;
      case 7:
        return AttributeDataTypeNames.RandomNumber;
      default:
        return AttributeDataTypeNames.String;
    }
  }

  mapBizType(bizType: number): AttributeBizTypeNames {
    switch (bizType) {
      case 1:
        return AttributeBizTypeNames.USER;
      case 2:
        return AttributeBizTypeNames.COMPANY;
      case 3:
        return AttributeBizTypeNames.MEMBERSHIP;
      case 4:
        return AttributeBizTypeNames.EVENT;
      default:
        return AttributeBizTypeNames.USER;
    }
  }
}
