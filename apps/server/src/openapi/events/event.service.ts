import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Event } from '../models/event.model';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { OpenAPIErrors } from '../constants/errors';
import { HttpStatus } from '@nestjs/common';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listEvents(
    projectId: string,
    cursor?: string,
    limit?: number,
  ): Promise<{ results: Event[]; next: string | null; previous: string | null }> {
    this.logger.log(`Listing events for project ${projectId}`);

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
        this.prisma.event.findMany({
          ...args,
          where: {
            projectId,
            deleted: false,
          },
          orderBy: { createdAt: 'desc' },
        }),
      () =>
        this.prisma.event.count({
          where: {
            projectId,
            deleted: false,
          },
        }),
      { first: pageSize, after: cursor },
    );

    return {
      results: result.edges.map((edge) => ({
        id: edge.node.id,
        object: 'event_definition',
        createdAt: edge.node.createdAt.toISOString(),
        description: edge.node.description,
        displayName: edge.node.displayName,
        name: edge.node.codeName,
      })),
      next: result.pageInfo.hasNextPage ? result.pageInfo.endCursor : null,
      previous: result.pageInfo.hasPreviousPage ? result.pageInfo.startCursor : null,
    };
  }
}
