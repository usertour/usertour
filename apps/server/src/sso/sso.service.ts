import { Injectable } from '@nestjs/common';
import { ProjectSSOIdentityProvider, Role } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';

import { FeatureRequiresLicenseError, ParamsError } from '@/common/errors';
import { ProjectsService } from '@/projects/projects.service';

import { CreateOidcSsoProviderInput } from './dto/create-oidc-sso-provider.input';
import { UpdateSsoProviderInput } from './dto/update-sso-provider.input';

@Injectable()
export class SsoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  /** Throws unless the project's plan currently grants OIDC SSO. */
  async assertOidcEntitled(projectId: string): Promise<void> {
    const config = await this.projectsService.getProjectConfig(projectId);
    if (!config.ssoOidc) {
      throw new FeatureRequiresLicenseError();
    }
  }

  private assertJitRole(role: Role): void {
    if (role !== Role.ADMIN && role !== Role.VIEWER) {
      throw new ParamsError('SSO default role must be ADMIN or VIEWER');
    }
  }

  async findById(id: string): Promise<ProjectSSOIdentityProvider | null> {
    return this.prisma.projectSSOIdentityProvider.findUnique({ where: { id } });
  }

  private async findByIdOrThrow(id: string): Promise<ProjectSSOIdentityProvider> {
    const provider = await this.findById(id);
    if (!provider) {
      throw new ParamsError('SSO provider not found');
    }
    return provider;
  }

  async createOidcProvider(
    projectId: string,
    input: CreateOidcSsoProviderInput,
  ): Promise<ProjectSSOIdentityProvider> {
    await this.assertOidcEntitled(projectId);
    this.assertJitRole(input.defaultRole);
    return this.prisma.projectSSOIdentityProvider.create({
      data: {
        projectId,
        type: 'OIDC',
        name: input.name,
        defaultRole: input.defaultRole,
        allowedDomains: input.allowedDomains ?? [],
        issuer: input.issuer,
        clientId: input.clientId,
        clientSecret: input.clientSecret,
        authorizationUrl: input.authorizationUrl ?? null,
        tokenUrl: input.tokenUrl ?? null,
        userInfoUrl: input.userInfoUrl ?? null,
      },
    });
  }

  async updateProvider(
    id: string,
    input: UpdateSsoProviderInput,
  ): Promise<ProjectSSOIdentityProvider> {
    const provider = await this.findByIdOrThrow(id);
    await this.assertOidcEntitled(provider.projectId);
    if (input.defaultRole !== undefined) {
      this.assertJitRole(input.defaultRole);
    }
    return this.prisma.projectSSOIdentityProvider.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.defaultRole !== undefined && { defaultRole: input.defaultRole }),
        ...(input.allowedDomains !== undefined && { allowedDomains: input.allowedDomains }),
        ...(input.issuer !== undefined && { issuer: input.issuer }),
        ...(input.clientId !== undefined && { clientId: input.clientId }),
        // Only rotate the secret when a non-empty value is supplied.
        ...(input.clientSecret && { clientSecret: input.clientSecret }),
        ...(input.authorizationUrl !== undefined && { authorizationUrl: input.authorizationUrl }),
        ...(input.tokenUrl !== undefined && { tokenUrl: input.tokenUrl }),
        ...(input.userInfoUrl !== undefined && { userInfoUrl: input.userInfoUrl }),
      },
    });
  }

  // Delete is allowed regardless of entitlement so a downgraded project can
  // still clean up its providers.
  async deleteProvider(id: string): Promise<boolean> {
    await this.findByIdOrThrow(id);
    await this.prisma.projectSSOIdentityProvider.delete({ where: { id } });
    return true;
  }

  // Authenticated owner view — always allowed so the owner can manage existing
  // config even if entitlement lapsed (the settings page itself gates the UI).
  async listProviders(projectId: string): Promise<ProjectSSOIdentityProvider[]> {
    return this.prisma.projectSSOIdentityProvider.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Pre-auth list for the login page: active providers only, and only when the
  // project is still OIDC-entitled (a downgraded project surfaces nothing).
  async listPublicProviders(
    projectId: string,
  ): Promise<Pick<ProjectSSOIdentityProvider, 'id' | 'name' | 'type'>[]> {
    const config = await this.projectsService.getProjectConfig(projectId);
    if (!config.ssoOidc) {
      return [];
    }
    return this.prisma.projectSSOIdentityProvider.findMany({
      where: { projectId, status: 'active' },
      select: { id: true, name: true, type: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
