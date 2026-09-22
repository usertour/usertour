import { UserEntity } from '@/common/decorators/user.decorator';
import { AuditWeb } from '@/modules/audit/decorators/audit.decorator';
import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { RequirePermission } from '@/modules/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/modules/auth/permission/scope-resolver.registry';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Capability } from '@usertour/types';
import { AttributeOnEventDTO } from './dtos/attribute-on-event.dto';
import { CreateEventInput } from './dtos/create-event.input';
import { DeleteEventInput } from './dtos/delete-event.input';
import { EventsDTO } from './dtos/events.dto';
import { QueryAttributeOnEventsInput } from './dtos/query-attribute-on-events.input';
import { QueryEventsInput } from './dtos/query-events.input';
import { UpdateEventInput } from './dtos/update-event.input';
import { EventsService } from './services/events.service';

@Resolver(() => EventsDTO)
@UseGuards(PermissionGuard)
export class EventsResolver {
  constructor(private service: EventsService) {}

  @Mutation(() => EventsDTO)
  @RequirePermission({ capability: Capability.EventCreate, scope: ScopeKind.Event })
  @AuditWeb({
    action: 'create',
    resourceType: 'event',
    resourceId: (_a, r) => String((r as { id?: string })?.id ?? ''),
  })
  async createEvent(@UserEntity() @Args('data') data: CreateEventInput) {
    return this.service.create(data);
  }

  @Mutation(() => EventsDTO)
  @RequirePermission({ capability: Capability.EventUpdate, scope: ScopeKind.Event })
  @AuditWeb({
    action: 'update',
    resourceType: 'event',
    resourceId: (a) => (a.data as { id: string }).id,
  })
  async updateEvent(@UserEntity() @Args('data') data: UpdateEventInput) {
    return await this.service.update(data);
  }

  @Mutation(() => EventsDTO)
  @RequirePermission({ capability: Capability.EventDelete, scope: ScopeKind.Event })
  @AuditWeb({
    action: 'delete',
    resourceType: 'event',
    resourceId: (a) => (a.data as { id: string }).id,
  })
  async deleteEvent(@UserEntity() @Args('data') { id }: DeleteEventInput) {
    return await this.service.delete(id);
  }

  @Query(() => [EventsDTO])
  @RequirePermission({ capability: Capability.EventRead, scope: ScopeKind.Event })
  async listEvents(@UserEntity() @Args() { projectId }: QueryEventsInput) {
    return await this.service.list(projectId);
  }

  @Query(() => [AttributeOnEventDTO])
  @RequirePermission({ capability: Capability.EventRead, scope: ScopeKind.Event })
  async listAttributeOnEvents(@Args() { eventId }: QueryAttributeOnEventsInput) {
    return await this.service.listAttributeOnEvents(eventId);
  }
}
