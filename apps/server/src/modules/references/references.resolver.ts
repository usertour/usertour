import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { RequirePermission } from '@/modules/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/modules/auth/permission/scope-resolver.registry';
import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Capability } from '@usertour/types';
import { DefinitionReferenceDTO } from './dtos/definition-reference.dto';
import { ListDefinitionReferencesArgs } from './dtos/list-definition-references.input';
import { ReferencesService } from './services/references.service';

@Resolver(() => DefinitionReferenceDTO)
@UseGuards(PermissionGuard)
export class ReferencesResolver {
  constructor(private readonly references: ReferencesService) {}

  /**
   * What still uses a definition — the list a delete dialog shows before the
   * delete is refused (ADR 0016). Same scan as MCP `list_references`.
   */
  @Query(() => [DefinitionReferenceDTO])
  @RequirePermission({ capability: Capability.ContentRead, scope: ScopeKind.Project })
  async listDefinitionReferences(@Args() { projectId, kind, id }: ListDefinitionReferencesArgs) {
    const { referrers } = await this.references.listReferences(projectId, kind, id);
    return referrers;
  }
}
