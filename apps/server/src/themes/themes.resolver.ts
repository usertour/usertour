import { Roles, RolesScopeEnum } from '@/common/decorators/roles.decorator';
import { ProjectIdArgs } from '@/environments/args/project-id.args';
import { ThemesGuard } from '@/themes/themes.guard';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
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
@UseGuards(ThemesGuard)
export class ThemesResolver {
  constructor(private themesService: ThemesService) {}

  @Mutation(() => Theme)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async createTheme(@Args('data') data: CreateThemeInput) {
    return this.themesService.createTheme(data);
  }

  @Mutation(() => Theme)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async updateTheme(@Args('data') data: UpdateThemeInput) {
    return await this.themesService.updateTheme(data);
  }

  @Mutation(() => Theme)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async setDefaultTheme(@Args('themeId') themeId: string) {
    return await this.themesService.setDefaultTheme(themeId);
  }

  @Mutation(() => Theme)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async copyTheme(@Args('data') data: CopyThemeInput) {
    return await this.themesService.copyTheme(data);
  }

  @Mutation(() => Theme)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async deleteTheme(@Args('data') data: DeleteThemeInput) {
    return await this.themesService.deleteTheme(data.id);
  }

  @Query(() => Theme)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER, RolesScopeEnum.VIEWER])
  async getTheme(@Args() { themeId }: ThemeIdArgs) {
    return await this.themesService.getTheme(themeId);
  }

  @Query(() => [Theme])
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER, RolesScopeEnum.VIEWER])
  async listThemes(@Args() { projectId }: ProjectIdArgs) {
    return await this.themesService.listThemesByProjectId(projectId);
  }
}
