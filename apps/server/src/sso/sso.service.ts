import { Injectable } from '@nestjs/common';
import { ProjectSSOIdentityProvider, Role } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';

import {
  FeatureRequiresLicenseError,
  ParamsError,
  SsoRequiresActiveProviderError,
} from '@/common/errors';
import { ProjectsService } from '@/projects/projects.service';

import { CreateOidcSsoProviderInput } from './dto/create-oidc-sso-provider.input';
import { UpdateProjectSsoSettingsInput } from './dto/update-project-sso-settings.input';
import { UpdateSsoProviderInput } from './dto/update-sso-provider.input';

/**
 * Project-level SSO settings, normalized so callers never branch on "row
 * exists". Absent row → defaults (no enforcement, ADMIN provisioning, trust
 * the IdP).
 */
export interface ResolvedSsoSettings {
  projectId: string;
  requireSso: boolean;
  defaultRole: Role;
  allowedDomains: string[];
}

const DEFAULT_SETTINGS: Omit<ResolvedSsoSettings, 'projectId'> = {
  requireSso: false,
  defaultRole: Role.ADMIN,
  allowedDomains: [],
};

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

  // --- Provider connections ---

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
    return this.prisma.projectSSOIdentityProvider.create({
      data: {
        projectId,
        type: 'OIDC',
        name: input.name,
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
    // Deactivating the last active provider while SSO is enforced would lock
    // every member out (they can't SSO and can't fall back to password).
    if (input.status === 'inactive') {
      await this.assertActiveProviderRemains(provider.projectId, id);
    }
    return this.prisma.projectSSOIdentityProvider.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.status !== undefined && { status: input.status }),
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
  // still clean up its providers — but not if it would strand members behind
  // an enforced-SSO project with no way in.
  async deleteProvider(id: string): Promise<boolean> {
    const provider = await this.findByIdOrThrow(id);
    await this.assertActiveProviderRemains(provider.projectId, id);
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

  // --- Project-level settings (enforcement + provisioning) ---

  /** Resolved settings for the project, with defaults when no row exists. */
  async getSettings(projectId: string): Promise<ResolvedSsoSettings> {
    const row = await this.prisma.projectSsoSettings.findUnique({ where: { projectId } });
    if (!row) {
      return { projectId, ...DEFAULT_SETTINGS };
    }
    return {
      projectId,
      requireSso: row.requireSso,
      defaultRole: row.defaultRole,
      allowedDomains: row.allowedDomains,
    };
  }

  async updateSettings(
    projectId: string,
    input: UpdateProjectSsoSettingsInput,
  ): Promise<ResolvedSsoSettings> {
    // Only enabling SSO usage requires the entitlement. Turning enforcement off
    // (or otherwise relaxing) must work even after a plan lapse, so a downgraded
    // project can lift its own lockout — same spirit as deleteProvider being
    // allowed regardless of entitlement.
    const enablesSsoUsage =
      input.requireSso === true ||
      input.defaultRole !== undefined ||
      input.allowedDomains !== undefined;
    if (enablesSsoUsage) {
      await this.assertOidcEntitled(projectId);
    }
    if (input.defaultRole !== undefined) {
      this.assertJitRole(input.defaultRole);
    }
    // Anti-lockout: never let a project switch SSO on without a way in. This is
    // the "about to enable" check, so it counts providers unconditionally — the
    // stored requireSso is still false here.
    if (input.requireSso === true) {
      if ((await this.countActiveProviders(projectId, null)) === 0) {
        throw new SsoRequiresActiveProviderError();
      }
    }
    await this.prisma.projectSsoSettings.upsert({
      where: { projectId },
      create: {
        projectId,
        ...(input.requireSso !== undefined && { requireSso: input.requireSso }),
        ...(input.defaultRole !== undefined && { defaultRole: input.defaultRole }),
        ...(input.allowedDomains !== undefined && { allowedDomains: input.allowedDomains }),
      },
      update: {
        ...(input.requireSso !== undefined && { requireSso: input.requireSso }),
        ...(input.defaultRole !== undefined && { defaultRole: input.defaultRole }),
        ...(input.allowedDomains !== undefined && { allowedDomains: input.allowedDomains }),
      },
    });
    return this.getSettings(projectId);
  }

  // Guard for removing/deactivating a provider: only an already-enforced project
  // can be stranded, so this no-ops unless requireSso is currently on. The enable
  // path doesn't use this (its precondition is the opposite — see updateSettings).
  private async assertActiveProviderRemains(
    projectId: string,
    excludeProviderId: string,
  ): Promise<void> {
    const settings = await this.getSettings(projectId);
    if (!settings.requireSso) {
      return;
    }
    if ((await this.countActiveProviders(projectId, excludeProviderId)) === 0) {
      throw new SsoRequiresActiveProviderError();
    }
  }

  private async countActiveProviders(
    projectId: string,
    excludeProviderId: string | null,
  ): Promise<number> {
    return this.prisma.projectSSOIdentityProvider.count({
      where: {
        projectId,
        status: 'active',
        ...(excludeProviderId ? { id: { not: excludeProviderId } } : {}),
      },
    });
  }
}
