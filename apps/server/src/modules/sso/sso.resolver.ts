import { UseGuards } from '@nestjs/common';

import { AuditWeb } from '@/audit/audit.decorator';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Capability } from '@usertour/types';

import { Public } from '@/common/decorators/public.decorator';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { RequirePermission } from '@/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/auth/permission/scope-resolver.registry';

import { CreateOidcSsoProviderInput } from './dtos/create-oidc-sso-provider.input';
import { ProjectSsoSettingsDTO } from './dtos/project-sso-settings.dto';
import { PublicSsoLoginDTO } from './dtos/public-sso-login.dto';
import { PublicSsoProviderDTO } from './dtos/public-sso-provider.dto';
import { SsoProviderDTO } from './dtos/sso-provider.dto';
import { UpdateProjectSsoSettingsInput } from './dtos/update-project-sso-settings.input';
import { UpdateSsoProviderInput } from './dtos/update-sso-provider.input';
import { SsoService } from './services/sso.service';

@Resolver(() => SsoProviderDTO)
@UseGuards(PermissionGuard)
export class SsoResolver {
  constructor(private readonly ssoService: SsoService) {}

  @Mutation(() => SsoProviderDTO)
  @RequirePermission({ capability: Capability.SsoManage, scope: ScopeKind.Project })
  @AuditWeb({ action: 'create', resourceType: 'sso_provider' })
  async createOidcSsoProvider(
    @Args('projectId') projectId: string,
    @Args('input') input: CreateOidcSsoProviderInput,
  ) {
    return this.ssoService.createOidcProvider(projectId, input);
  }

  @Mutation(() => SsoProviderDTO)
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

  @Query(() => [SsoProviderDTO])
  @RequirePermission({ capability: Capability.SsoRead, scope: ScopeKind.Project })
  async listProjectSsoProviders(@Args('projectId') projectId: string) {
    return this.ssoService.listProviders(projectId);
  }

  // Project-level SSO settings: force-SSO enforcement + JIT provisioning policy.
  @Query(() => ProjectSsoSettingsDTO)
  @RequirePermission({ capability: Capability.SsoRead, scope: ScopeKind.Project })
  async getProjectSsoSettings(@Args('projectId') projectId: string) {
    return this.ssoService.getSettings(projectId);
  }

  @Mutation(() => ProjectSsoSettingsDTO)
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
  @Query(() => [PublicSsoProviderDTO])
  @Public()
  async getProjectSsoProviders(@Args('projectId') projectId: string) {
    return this.ssoService.listPublicProviders(projectId);
  }

  // Pre-auth: the SSO entry page reads the project's branding + active providers.
  @Query(() => PublicSsoLoginDTO)
  @Public()
  async getProjectSsoLogin(@Args('projectId') projectId: string) {
    return this.ssoService.getPublicSsoLogin(projectId);
  }
}
