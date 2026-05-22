import { UserEntity } from '@/common/decorators/user.decorator';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { RequirePermission } from '@/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/auth/permission/scope-resolver.registry';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Capability } from '@usertour/types';
import { QueryAttributeOnEventsInput } from './dto/attributeOnEvent.input';
import {
  CreateEventInput,
  DeleteEventInput,
  QueryEventsInput,
  UpdateEventInput,
} from './dto/events.input';
import { EventsService } from './events.service';
import { AttributeOnEvent } from './models/attributeOnEvent.model';
import { Events } from './models/events.model';

@Resolver(() => Events)
@UseGuards(PermissionGuard)
export class EventsResolver {
  constructor(private service: EventsService) {}

  @Mutation(() => Events)
  @RequirePermission({ capability: Capability.EventCreate, scope: ScopeKind.Event })
  async createEvent(@UserEntity() @Args('data') data: CreateEventInput) {
    return this.service.create(data);
  }

  @Mutation(() => Events)
  @RequirePermission({ capability: Capability.EventUpdate, scope: ScopeKind.Event })
  async updateEvent(@UserEntity() @Args('data') data: UpdateEventInput) {
    return await this.service.update(data);
  }

  @Mutation(() => Events)
  @RequirePermission({ capability: Capability.EventDelete, scope: ScopeKind.Event })
  async deleteEvent(@UserEntity() @Args('data') { id }: DeleteEventInput) {
    return await this.service.delete(id);
  }

  @Query(() => [Events])
  @RequirePermission({ capability: Capability.EventRead, scope: ScopeKind.Event })
  async listEvents(@UserEntity() @Args() { projectId }: QueryEventsInput) {
    return await this.service.list(projectId);
  }

  @Query(() => [AttributeOnEvent])
  @RequirePermission({ capability: Capability.EventRead, scope: ScopeKind.Event })
  async listAttributeOnEvents(@Args() { eventId }: QueryAttributeOnEventsInput) {
    return await this.service.listAttributeOnEvents(eventId);
  }
}
