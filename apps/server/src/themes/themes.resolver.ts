import { ProjectIdArgs } from '@/environments/args/project-id.args';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { RequirePermission } from '@/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/auth/permission/scope-resolver.registry';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Capability } from '@usertour/types';
import { ThemeIdArgs } from './args/theme-id.args';
import {
  CopyThemeInput,
  CreateThemeInput,
  DeleteThemeInput,
  UpdateThemeInput,
} from './dto/theme.input';
import { Theme } from './models/theme.model';
import { ThemesService } from './themes.service';

@Resolver(() => Theme)
@UseGuards(PermissionGuard)
export class ThemesResolver {
  constructor(private themesService: ThemesService) {}

  @Mutation(() => Theme)
  @RequirePermission({ capability: Capability.ThemeCreate, scope: ScopeKind.Theme })
  async createTheme(@Args('data') data: CreateThemeInput) {
    return this.themesService.createTheme(data);
  }

  @Mutation(() => Theme)
  @RequirePermission({ capability: Capability.ThemeUpdate, scope: ScopeKind.Theme })
  async updateTheme(@Args('data') data: UpdateThemeInput) {
    return await this.themesService.updateTheme(data);
  }

  @Mutation(() => Theme)
  @RequirePermission({ capability: Capability.ThemeUpdate, scope: ScopeKind.Theme })
  async setDefaultTheme(@Args('themeId') themeId: string) {
    return await this.themesService.setDefaultTheme(themeId);
  }

  @Mutation(() => Theme)
  @RequirePermission({ capability: Capability.ThemeCreate, scope: ScopeKind.Theme })
  async copyTheme(@Args('data') data: CopyThemeInput) {
    return await this.themesService.copyTheme(data);
  }

  @Mutation(() => Theme)
  @RequirePermission({ capability: Capability.ThemeDelete, scope: ScopeKind.Theme })
  async deleteTheme(@Args('data') data: DeleteThemeInput) {
    return await this.themesService.deleteTheme(data.id);
  }

  @Query(() => Theme)
  @RequirePermission({ capability: Capability.ThemeRead, scope: ScopeKind.Theme })
  async getTheme(@Args() { themeId }: ThemeIdArgs) {
    return await this.themesService.getTheme(themeId);
  }

  @Query(() => [Theme])
  @RequirePermission({ capability: Capability.ThemeRead, scope: ScopeKind.Theme })
  async listThemes(@Args() { projectId }: ProjectIdArgs) {
    return await this.themesService.listThemesByProjectId(projectId);
  }
}
