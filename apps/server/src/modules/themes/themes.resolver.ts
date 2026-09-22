import { ProjectIdArgs } from '@/modules/environments/dtos/project-id.input';
import { AuditWeb } from '@/modules/audit/decorators/audit.decorator';
import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { RequirePermission } from '@/modules/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/modules/auth/permission/scope-resolver.registry';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Capability } from '@usertour/types';
import { CopyThemeInput } from './dtos/copy-theme.input';
import { CreateThemeInput } from './dtos/create-theme.input';
import { DeleteThemeInput } from './dtos/delete-theme.input';
import { ThemeDTO } from './dtos/theme.dto';
import { ThemeIdArgs } from './dtos/theme-id.input';
import { UpdateThemeInput } from './dtos/update-theme.input';
import { ThemesService } from './services/themes.service';

@Resolver(() => ThemeDTO)
@UseGuards(PermissionGuard)
export class ThemesResolver {
  constructor(private themesService: ThemesService) {}

  @Mutation(() => ThemeDTO)
  @RequirePermission({ capability: Capability.ThemeCreate, scope: ScopeKind.Theme })
  @AuditWeb({
    action: 'create',
    resourceType: 'theme',
    resourceId: (_a, r) => String((r as { id?: string })?.id ?? ''),
  })
  async createTheme(@Args('data') data: CreateThemeInput) {
    return this.themesService.createTheme(data);
  }

  @Mutation(() => ThemeDTO)
  @RequirePermission({ capability: Capability.ThemeUpdate, scope: ScopeKind.Theme })
  @AuditWeb({
    action: 'update',
    resourceType: 'theme',
    resourceId: (a) => (a.data as { id: string }).id,
  })
  async updateTheme(@Args('data') data: UpdateThemeInput) {
    return await this.themesService.updateTheme(data);
  }

  @Mutation(() => ThemeDTO)
  @RequirePermission({ capability: Capability.ThemeUpdate, scope: ScopeKind.Theme })
  @AuditWeb({ action: 'update', resourceType: 'theme', resourceId: (a) => String(a.themeId) })
  async setDefaultTheme(@Args('themeId') themeId: string) {
    return await this.themesService.setDefaultTheme(themeId);
  }

  @Mutation(() => ThemeDTO)
  @RequirePermission({ capability: Capability.ThemeCreate, scope: ScopeKind.Theme })
  @AuditWeb({
    action: 'create',
    resourceType: 'theme',
    resourceId: (_a, r) => String((r as { id?: string })?.id ?? ''),
  })
  async copyTheme(@Args('data') data: CopyThemeInput) {
    return await this.themesService.copyTheme(data);
  }

  @Mutation(() => ThemeDTO)
  @RequirePermission({ capability: Capability.ThemeDelete, scope: ScopeKind.Theme })
  @AuditWeb({
    action: 'delete',
    resourceType: 'theme',
    resourceId: (a) => (a.data as { id: string }).id,
  })
  async deleteTheme(@Args('data') data: DeleteThemeInput) {
    return await this.themesService.deleteTheme(data.id);
  }

  @Query(() => ThemeDTO)
  @RequirePermission({ capability: Capability.ThemeRead, scope: ScopeKind.Theme })
  async getTheme(@Args() { themeId }: ThemeIdArgs) {
    return await this.themesService.getTheme(themeId);
  }

  @Query(() => [ThemeDTO])
  @RequirePermission({ capability: Capability.ThemeRead, scope: ScopeKind.Theme })
  async listThemes(@Args() { projectId }: ProjectIdArgs) {
    return await this.themesService.listThemesByProjectId(projectId);
  }
}
