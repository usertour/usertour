import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateAttributeOnEventInput } from './dto/attributeOnEvent.input';
import { CreateEventInput, UpdateEventInput } from './dto/events.input';
import { ParamsError, ResourceAlreadyExistsError, UnknownError } from '@/common/errors';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { PaginationConnection } from '@/common/openapi/pagination';
import { Event, Prisma } from '@prisma/client';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: CreateEventInput) {
    const { attributeIds } = data;

    data.attributeIds = undefined;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const createEvent = await tx.event.create({
          data,
        });

        if (!createEvent || !createEvent.id) {
          throw new ParamsError();
        }

        const eventId = createEvent.id;
        const formattedArray = attributeIds.map((attributeId) => ({
          attributeId,
          eventId,
        }));

        const createAttributeOnEvent = await tx.attributeOnEvent.createMany({
          data: formattedArray,
        });

        if (!createAttributeOnEvent) {
          throw new ParamsError();
        }

        return createEvent;
      });
    } catch (err) {
      // (projectId, codeName) is unique — surface dup as a typed
      // ResourceAlreadyExistsError instead of swallowing it as
      // UnknownError. Mirrors the catch in attributes.service / localizations.service.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ResourceAlreadyExistsError();
      }
      throw new UnknownError();
    }
  }

  async createAttributeOnEvent(data: CreateAttributeOnEventInput[]) {
    return await this.prisma.attributeOnEvent.createMany({
      data,
    });
  }

  async update(data: UpdateEventInput) {
    const { id, displayName, codeName, description, attributeIds } = data;

    return await this.prisma.$transaction(async (tx) => {
      const updateEvent = await tx.event.update({
        where: { id },
        data: {
          displayName,
          codeName,
          description,
        },
      });

      await tx.attributeOnEvent.deleteMany({
        where: { eventId: id },
      });

      const formattedArray = attributeIds.map((attributeId) => ({
        attributeId,
        eventId: id,
      }));

      await tx.attributeOnEvent.createMany({
        data: formattedArray,
      });

      return updateEvent;
    });
  }

  /**
   * Update only the event's own fields, leaving its attributeOnEvent links
   * untouched (unlike {@link update}, which rewrites them from `attributeIds`).
   * Used by the v2 API's partial event-definition update.
   */
  async updateInfo(id: string, data: { displayName?: string; description?: string }) {
    return await this.prisma.event.update({ where: { id }, data });
  }

  async delete(id: string) {
    return await this.prisma.$transaction(async (tx) => {
      await tx.attributeOnEvent.deleteMany({
        where: { eventId: id },
      });

      const deleteEvent = await tx.event.delete({
        where: { id },
      });
      return deleteEvent;
    });
  }

  async get(id: string) {
    return await this.prisma.event.findUnique({
      where: { id },
    });
  }

  async list(projectId: string) {
    return await this.prisma.event.findMany({
      where: { projectId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  async listAttributeOnEvents(eventId: string) {
    return await this.prisma.attributeOnEvent.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listWithPagination(
    projectId: string,
    paginationArgs: {
      first?: number;
      last?: number;
      after?: string;
      before?: string;
    },
    orderBy: Prisma.EventOrderByWithRelationInput[],
  ): Promise<PaginationConnection<Event>> {
    const baseQuery = {
      where: { projectId, deleted: false },
      orderBy,
    };
    return findManyCursorConnection(
      (args) =>
        this.prisma.event.findMany({
          ...baseQuery,
          ...args,
        }),
      () =>
        this.prisma.event.count({
          ...baseQuery,
        }),
      paginationArgs,
    );
  }
}
