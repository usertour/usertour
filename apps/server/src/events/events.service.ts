import { PrismaService } from "nestjs-prisma";
import { BadRequestException, Injectable } from "@nestjs/common";
import { CreateEventInput, UpdateEventInput } from "./dto/events.input";
import { CreateAttributeOnEventInput } from "./dto/attributeOnEvent.input";

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateEventInput) {
    const { attributeIds } = data;

    delete data.attributeIds;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const createEvent = await tx.event.create({
          data,
        });

        if (!createEvent || !createEvent.id) {
          throw new BadRequestException(
            "Failed to create event or get event ID"
          );
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
          throw new BadRequestException(
            "Failed to create attributes for event"
          );
        }

        return createEvent;
      });
    } catch (error) {
      throw new BadRequestException("Failed to create event");
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
      orderBy: { createdAt: "asc" },
    });
  }

  async listAttributeOnEvents(eventId: string) {
    return await this.prisma.attributeOnEvent.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
    });
  }
}
