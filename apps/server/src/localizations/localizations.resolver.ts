import { AuditWeb } from '@/audit/audit.decorator';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { RequirePermission } from '@/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/auth/permission/scope-resolver.registry';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Capability } from '@usertour/types';
import {
  CreateLocalizationInput,
  DeleteLocalizationInput,
  QueryLocalizationInput,
  UpdateLocalizationInput,
} from './dto/localization.input';
import { LocalizationsService } from './localizations.service';
import { Localization } from './models/localization.model';

@Resolver(() => Localization)
@UseGuards(PermissionGuard)
export class LocalizationsResolver {
  constructor(private service: LocalizationsService) {}

  @Mutation(() => Localization)
  @RequirePermission({ capability: Capability.LocalizationCreate, scope: ScopeKind.Localization })
  @AuditWeb({
    action: 'create',
    resourceType: 'localization',
    resourceId: (_a, r) => (r as { id: string }).id,
  })
  async createLocalization(@Args('data') data: CreateLocalizationInput) {
    return this.service.create(data);
  }

  @Mutation(() => Localization)
  @RequirePermission({ capability: Capability.LocalizationUpdate, scope: ScopeKind.Localization })
  @AuditWeb({
    action: 'update',
    resourceType: 'localization',
    resourceId: (a) => (a.data as { id: string }).id,
  })
  async updateLocalization(@Args('data') data: UpdateLocalizationInput) {
    return await this.service.update(data);
  }

  @Mutation(() => Localization)
  @RequirePermission({ capability: Capability.LocalizationUpdate, scope: ScopeKind.Localization })
  @AuditWeb({ action: 'update', resourceType: 'localization', resourceId: (a) => String(a.id) })
  async setDefaultLocalization(@Args('id') id: string) {
    return await this.service.setDefault(id);
  }

  @Mutation(() => Localization)
  @RequirePermission({ capability: Capability.LocalizationDelete, scope: ScopeKind.Localization })
  @AuditWeb({
    action: 'delete',
    resourceType: 'localization',
    resourceId: (a) => (a.data as { id: string }).id,
  })
  async deleteLocalization(@Args('data') { id }: DeleteLocalizationInput) {
    return await this.service.delete(id);
  }

  @Query(() => [Localization])
  @RequirePermission({ capability: Capability.LocalizationRead, scope: ScopeKind.Localization })
  async listLocalizations(@Args() { projectId }: QueryLocalizationInput) {
    return await this.service.findMany(projectId);
  }
}
