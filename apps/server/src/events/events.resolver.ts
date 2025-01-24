import { Resolver, Mutation, Args, Query } from "@nestjs/graphql";
import { UserEntity } from "@/common/decorators/user.decorator";
import { EventsService } from "./events.service";
import { Events } from "./models/events.model";
import { AttributeOnEvent } from "./models/attributeOnEvent.model";
import {
  CreateEventInput,
  DeleteEventInput,
  UpdateEventInput,
  QueryEventsInput,
} from "./dto/events.input";
import { QueryAttributeOnEventsInput } from "./dto/attributeOnEvent.input";
import { RolesScopeEnum, Roles } from "@/common/decorators/roles.decorator";
import { UseGuards } from "@nestjs/common";
import { EventsGuard } from "./events.guard";

@Resolver(() => Events)
@UseGuards(EventsGuard)
export class EventsResolver {
  constructor(private service: EventsService) {}

  @Mutation(() => Events)
  @Roles([RolesScopeEnum.ADMIN])
  async createEvent(@UserEntity() @Args("data") data: CreateEventInput) {
    return this.service.create(data);
  }

  @Mutation(() => Events)
  @Roles([RolesScopeEnum.ADMIN])
  async updateEvent(@UserEntity() @Args("data") data: UpdateEventInput) {
    return await this.service.update(data);
  }

  @Mutation(() => Events)
  @Roles([RolesScopeEnum.ADMIN])
  async deleteEvent(@UserEntity() @Args("data") { id }: DeleteEventInput) {
    return await this.service.delete(id);
  }

  @Query(() => [Events])
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.USER])
  async listEvents(@UserEntity() @Args() { projectId }: QueryEventsInput) {
    return await this.service.list(projectId);
  }

  @Query(() => [AttributeOnEvent])
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.USER])
  async listAttributeOnEvents(
    @Args() { eventId }: QueryAttributeOnEventsInput
  ) {
    return await this.service.listAttributeOnEvents(eventId);
  }
}
