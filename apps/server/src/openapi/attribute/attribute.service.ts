import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Attribute } from '../models/attribute.model';
import { ListAttributesResponseDto } from './attribute.dto';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { AttributesService } from '@/attributes/attributes.service';
import { OpenAPIErrors } from '../constants/errors';
import { HttpStatus } from '@nestjs/common';

@Injectable()
export class AttributeService {
  private readonly logger = new Logger(AttributeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attributesService: AttributesService,
  ) {}

  async listAttributes(
    projectId: string,
    cursor?: string,
    limit = 20,
  ): Promise<ListAttributesResponseDto> {
    // Validate limit
    const pageSize = Number(limit) || 20;
    if (Number.isNaN(pageSize) || pageSize < 1) {
      throw new OpenAPIException(
        OpenAPIErrors.USER.INVALID_LIMIT.message,
        HttpStatus.BAD_REQUEST,
        OpenAPIErrors.USER.INVALID_LIMIT.code,
      );
    }

    const result = await findManyCursorConnection(
      (args) =>
        this.prisma.attribute.findMany({
          ...args,
          where: {
            projectId,
            deleted: false,
          },
          orderBy: { createdAt: 'desc' },
        }),
      () =>
        this.prisma.attribute.count({
          where: {
            projectId,
            deleted: false,
          },
        }),
      { first: pageSize, after: cursor },
    );

    return {
      results: result.edges.map((edge) => this.mapToAttribute(edge.node)),
      next: result.pageInfo.hasNextPage ? result.pageInfo.endCursor : null,
      previous: result.pageInfo.hasPreviousPage ? result.pageInfo.startCursor : null,
    };
  }

  private mapToAttribute(attribute: any): Attribute {
    return {
      id: attribute.id,
      object: 'attribute',
      createdAt: attribute.createdAt.toISOString(),
      dataType: this.attributesService.mapDataType(attribute.dataType),
      description: attribute.description,
      displayName: attribute.displayName,
      name: attribute.codeName,
      scope: this.attributesService.mapBizType(attribute.bizType),
    };
  }
}
