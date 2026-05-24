import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Capability } from '@usertour/types';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { RequirePermission } from '@/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/auth/permission/scope-resolver.registry';
import { AttributesService } from './attributes.service';
import {
  CreateAttributeInput,
  DeleteAttributeInput,
  QueryAttributeInput,
  UpdateAttributeInput,
} from './dto/attribute.input';
import { Attribute } from './models/attribute.model';

@Resolver(() => Attribute)
@UseGuards(PermissionGuard)
export class AttributesResolver {
  constructor(private service: AttributesService) {}

  @Mutation(() => Attribute)
  @RequirePermission({ capability: Capability.AttributeCreate, scope: ScopeKind.Attribute })
  async createAttribute(@Args('data') data: CreateAttributeInput) {
    return this.service.create(data);
  }

  @Mutation(() => Attribute)
  @RequirePermission({ capability: Capability.AttributeUpdate, scope: ScopeKind.Attribute })
  async updateAttribute(@Args('data') data: UpdateAttributeInput) {
    return await this.service.update(data);
  }

  @Mutation(() => Attribute)
  @RequirePermission({ capability: Capability.AttributeDelete, scope: ScopeKind.Attribute })
  async deleteAttribute(@Args('data') { id }: DeleteAttributeInput) {
    return await this.service.delete(id);
  }

  @Query(() => [Attribute])
  @RequirePermission({ capability: Capability.AttributeRead, scope: ScopeKind.Attribute })
  async listAttributes(@Args() { projectId, bizType }: QueryAttributeInput) {
    return await this.service.list(projectId, bizType);
  }
}
