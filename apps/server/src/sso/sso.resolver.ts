import { UseGuards } from '@nestjs/common';

import { AuditWeb } from '@/audit/audit.decorator';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Capability } from '@usertour/types';

import { Public } from '@/common/decorators/public.decorator';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { RequirePermission } from '@/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/auth/permission/scope-resolver.registry';

import { CreateOidcSsoProviderInput } from './dto/create-oidc-sso-provider.input';
import { UpdateProjectSsoSettingsInput } from './dto/update-project-sso-settings.input';
import { UpdateSsoProviderInput } from './dto/update-sso-provider.input';
import { ProjectSsoSettingsModel } from './models/project-sso-settings.model';
import { PublicSsoLoginModel } from './models/public-sso-login.model';
import { PublicSsoProviderModel } from './models/public-sso-provider.model';
import { SsoProviderModel } from './models/sso-provider.model';
import { SsoService } from './sso.service';

@Resolver(() => SsoProviderModel)
@UseGuards(PermissionGuard)
export class SsoResolver {
  constructor(private readonly ssoService: SsoService) {}

  @Mutation(() => SsoProviderModel)
  @RequirePermission({ capability: Capability.SsoManage, scope: ScopeKind.Project })
  @AuditWeb({ action: 'create', resourceType: 'sso_provider' })
  async createOidcSsoProvider(
    @Args('projectId') projectId: string,
    @Args('input') input: CreateOidcSsoProviderInput,
  ) {
    return this.ssoService.createOidcProvider(projectId, input);
  }

  @Mutation(() => SsoProviderModel)
  @RequirePermission({ capability: Capability.SsoManage, scope: ScopeKind.Sso })
  @AuditWeb({ action: 'update', resourceType: 'sso_provider' })
  async updateSsoProvider(@Args('id') id: string, @Args('input') input: UpdateSsoProviderInput) {
    return this.ssoService.updateProvider(id, input);
  }

  @Mutation(() => Boolean)
  @RequirePermission({ capability: Capability.SsoManage, scope: ScopeKind.Sso })
  @AuditWeb({ action: 'delete', resourceType: 'sso_provider' })
  async deleteSsoProvider(@Args('id') id: string) {
    return this.ssoService.deleteProvider(id);
  }

  @Query(() => [SsoProviderModel])
  @RequirePermission({ capability: Capability.SsoRead, scope: ScopeKind.Project })
  async listProjectSsoProviders(@Args('projectId') projectId: string) {
    return this.ssoService.listProviders(projectId);
  }

  // Project-level SSO settings: force-SSO enforcement + JIT provisioning policy.
  @Query(() => ProjectSsoSettingsModel)
  @RequirePermission({ capability: Capability.SsoRead, scope: ScopeKind.Project })
  async getProjectSsoSettings(@Args('projectId') projectId: string) {
    return this.ssoService.getSettings(projectId);
  }

  @Mutation(() => ProjectSsoSettingsModel)
  @RequirePermission({ capability: Capability.SsoManage, scope: ScopeKind.Project })
  @AuditWeb({
    action: 'update',
    resourceType: 'project_sso_settings',
    resourceId: (args) => String(args.projectId ?? ''),
  })
  async updateProjectSsoSettings(
    @Args('projectId') projectId: string,
    @Args('input') input: UpdateProjectSsoSettingsInput,
  ) {
    return this.ssoService.updateSettings(projectId, input);
  }

  // Pre-auth: the project's SSO login page reads its active providers. No auth
  // (Public) and no @RequirePermission, so both guards let it through; the
  // service still gates on the project's OIDC entitlement.
  @Query(() => [PublicSsoProviderModel])
  @Public()
  async getProjectSsoProviders(@Args('projectId') projectId: string) {
    return this.ssoService.listPublicProviders(projectId);
  }

  // Pre-auth: the SSO entry page reads the project's branding + active providers.
  @Query(() => PublicSsoLoginModel)
  @Public()
  async getProjectSsoLogin(@Args('projectId') projectId: string) {
    return this.ssoService.getPublicSsoLogin(projectId);
  }
}
