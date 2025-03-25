import { Roles, RolesScopeEnum } from '@/common/decorators/roles.decorator';
import { UserEntity } from '@/common/decorators/user.decorator';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { QueryAttributeOnEventsInput } from './dto/attributeOnEvent.input';
import {
  CreateEventInput,
  DeleteEventInput,
  QueryEventsInput,
  UpdateEventInput,
} from './dto/events.input';
import { EventsGuard } from './events.guard';
import { EventsService } from './events.service';
import { AttributeOnEvent } from './models/attributeOnEvent.model';
import { Events } from './models/events.model';

@Resolver(() => Events)
@UseGuards(EventsGuard)
export class EventsResolver {
  constructor(private service: EventsService) {}

  @Mutation(() => Events)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async createEvent(@UserEntity() @Args('data') data: CreateEventInput) {
    return this.service.create(data);
  }

  @Mutation(() => Events)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async updateEvent(@UserEntity() @Args('data') data: UpdateEventInput) {
    return await this.service.update(data);
  }

  @Mutation(() => Events)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async deleteEvent(@UserEntity() @Args('data') { id }: DeleteEventInput) {
    return await this.service.delete(id);
  }

  @Query(() => [Events])
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER, RolesScopeEnum.VIEWER])
  async listEvents(@UserEntity() @Args() { projectId }: QueryEventsInput) {
    return await this.service.list(projectId);
  }

  @Query(() => [AttributeOnEvent])
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER, RolesScopeEnum.VIEWER])
  async listAttributeOnEvents(@Args() { eventId }: QueryAttributeOnEventsInput) {
    return await this.service.listAttributeOnEvents(eventId);
  }
}
