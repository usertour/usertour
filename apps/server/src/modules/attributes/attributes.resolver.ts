import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Capability } from '@usertour/types';
import { AuditWeb } from '@/modules/audit/decorators/audit.decorator';
import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { RequirePermission } from '@/modules/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/modules/auth/permission/scope-resolver.registry';
import { AttributeDTO } from './dtos/attribute.dto';
import { CreateAttributeInput } from './dtos/create-attribute.input';
import { DeleteAttributeInput } from './dtos/delete-attribute.input';
import { QueryAttributeInput } from './dtos/query-attribute.input';
import { UpdateAttributeInput } from './dtos/update-attribute.input';
import { AttributesService } from './services/attributes.service';

@Resolver(() => AttributeDTO)
@UseGuards(PermissionGuard)
export class AttributesResolver {
  constructor(private service: AttributesService) {}

  @Mutation(() => AttributeDTO)
  @RequirePermission({ capability: Capability.AttributeCreate, scope: ScopeKind.Attribute })
  @AuditWeb({
    action: 'create',
    resourceType: 'attribute',
    resourceId: (_a, r) => String((r as { id?: string })?.id ?? ''),
  })
  async createAttribute(@Args('data') data: CreateAttributeInput) {
    return this.service.create(data);
  }

  @Mutation(() => AttributeDTO)
  @RequirePermission({ capability: Capability.AttributeUpdate, scope: ScopeKind.Attribute })
  @AuditWeb({
    action: 'update',
    resourceType: 'attribute',
    resourceId: (a) => (a.data as { id: string }).id,
  })
  async updateAttribute(@Args('data') data: UpdateAttributeInput) {
    return await this.service.update(data);
  }

  @Mutation(() => AttributeDTO)
  @RequirePermission({ capability: Capability.AttributeDelete, scope: ScopeKind.Attribute })
  @AuditWeb({
    action: 'delete',
    resourceType: 'attribute',
    resourceId: (a) => (a.data as { id: string }).id,
  })
  async deleteAttribute(@Args('data') { id }: DeleteAttributeInput) {
    return await this.service.delete(id);
  }

  @Query(() => [AttributeDTO])
  @RequirePermission({ capability: Capability.AttributeRead, scope: ScopeKind.Attribute })
  async listAttributes(@Args() { projectId, bizType }: QueryAttributeInput) {
    return await this.service.list(projectId, bizType);
  }
}
