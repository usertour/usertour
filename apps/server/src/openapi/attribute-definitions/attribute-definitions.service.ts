import { Injectable } from '@nestjs/common';
import { AttributesService } from '@/attributes/attributes.service';
import { ListAttributesDto } from './attribute-definitions.dto';
import { OpenApiObjectType } from '@/common/types/openapi';
import { AttributeBizTypeNames, AttributeDataTypeNames } from '@/attributes/models/attribute.model';
import { Attribute } from '@/openapi/models/attribute.model';
import { ConfigService } from '@nestjs/config';
import { paginate } from '@/common/openapi/pagination';

@Injectable()
export class OpenAPIAttributeDefinitionsService {
  constructor(
    private readonly attributesService: AttributesService,
    private readonly configService: ConfigService,
  ) {}

  async listAttributeDefinitions(projectId: string, dto: ListAttributesDto) {
    const { cursor, limit = 20, scope } = dto;
    const apiUrl = this.configService.get<string>('app.apiUrl');
    const endpointUrl = `${apiUrl}/v1/attribute-definitions`;

    return paginate(
      endpointUrl,
      cursor,
      limit,
      async (params) => {
        const bizType = scope ? this.mapOpenApiObjectTypeToBizType(scope) : undefined;
        return this.attributesService.listWithPagination(projectId, params, bizType);
      },
      (node) => this.mapToAttribute(node),
      scope ? { scope } : {},
    );
  }

  private mapOpenApiObjectTypeToBizType(scope: OpenApiObjectType): number {
    switch (scope) {
      case OpenApiObjectType.USER:
        return 1;
      case OpenApiObjectType.COMPANY:
        return 2;
      case OpenApiObjectType.COMPANY_MEMBERSHIP:
        return 3;
      case OpenApiObjectType.EVENT_DEFINITION:
        return 4;
      default:
        return 1;
    }
  }

  private mapToAttribute(attribute: any): Attribute {
    return {
      id: attribute.id,
      object: OpenApiObjectType.ATTRIBUTE_DEFINITION,
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
