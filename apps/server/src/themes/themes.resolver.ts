import { Resolver, Mutation, Args, Query } from "@nestjs/graphql";
import { ThemesService } from "./themes.service";
import { Theme } from "./models/theme.model";
import {
  CopyThemeInput,
  CreateThemeInput,
  DeleteThemeInput,
  UpdateThemeInput,
} from "./dto/theme.input";
import { ThemeIdArgs } from "./args/theme-id.args";
import { ProjectIdArgs } from "@/environments/args/project-id.args";
import { RolesScopeEnum, Roles } from "@/common/decorators/roles.decorator";
import { UseGuards } from "@nestjs/common";
import { ThemesGuard } from "@/themes/themes.guard";

@Resolver(() => Theme)
@UseGuards(ThemesGuard)
export class ThemesResolver {
  constructor(private themesService: ThemesService) {}

  @Mutation(() => Theme)
  @Roles([RolesScopeEnum.ADMIN])
  async createTheme(@Args("data") data: CreateThemeInput) {
    return this.themesService.createTheme(data);
  }

  @Mutation(() => Theme)
  @Roles([RolesScopeEnum.ADMIN])
  async updateTheme(@Args("data") data: UpdateThemeInput) {
    return await this.themesService.updateTheme(data);
  }

  @Mutation(() => Theme)
  @Roles([RolesScopeEnum.ADMIN])
  async setDefaultTheme(@Args("themeId") themeId: string) {
    return await this.themesService.setDefaultTheme(themeId);
  }

  @Mutation(() => Theme)
  @Roles([RolesScopeEnum.ADMIN])
  async copyTheme(@Args("data") data: CopyThemeInput) {
    return await this.themesService.copyTheme(data);
  }

  @Mutation(() => Theme)
  @Roles([RolesScopeEnum.ADMIN])
  async deleteTheme(@Args("data") data: DeleteThemeInput) {
    return await this.themesService.deleteTheme(data.id);
  }

  @Query(() => Theme)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.USER])
  async getTheme(@Args() { themeId }: ThemeIdArgs) {
    return await this.themesService.getTheme(themeId);
  }

  @Query(() => [Theme])
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.USER])
  async listThemes(@Args() { projectId }: ProjectIdArgs) {
    return await this.themesService.listThemesByProjectId(projectId);
  }
}
