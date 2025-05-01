import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AttributesService } from '@/attributes/attributes.service';
import { Environment } from '@/environments/models/environment.model';
import { mapBizType, mapDataType, OpenApiObjectType } from '@/common/openapi/types';
import { InvalidScopeError } from '@/common/errors/errors';
import { isValidOpenApiObjectType, mapOpenApiObjectTypeToBizType } from '@/common/openapi/types';
import { paginate } from '@/common/openapi/pagination';
import { parseOrderBy } from '@/common/openapi/sort';

@Injectable()
export class OpenAPIAttributeDefinitionsService {
  constructor(
    private readonly attributesService: AttributesService,
    private readonly configService: ConfigService,
  ) {}

  async listAttributeDefinitions(
    originalUrl: string,
    environment: Environment,
    limit: number,
    scope: OpenApiObjectType,
    cursor: string,
    orderBy: string[],
    eventName: string[],
  ) {
    const projectId = environment.projectId;

    if (scope && !isValidOpenApiObjectType(scope)) {
      throw new InvalidScopeError(scope);
    }
    const apiUrl = this.configService.get<string>('app.apiUrl');
    const completeUrl = `${apiUrl}${originalUrl}`;
    const sortOrders = parseOrderBy(orderBy);

    const bizType = scope ? mapOpenApiObjectTypeToBizType(scope) : undefined;

    return paginate(
      completeUrl,
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
      (node) => ({
        id: node.id,
        object: OpenApiObjectType.ATTRIBUTE_DEFINITION,
        createdAt:
          typeof node.createdAt === 'string' ? node.createdAt : node.createdAt.toISOString(),
        dataType: mapDataType(node.dataType),
        description: node.description,
        displayName: node.displayName,
        codeName: node.codeName,
        scope: mapBizType(node.bizType),
      }),
    );
  }
}
