import { ThemesService } from '@/themes/themes.service';
import { CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { Roles, RolesScopeEnum } from '@/common/decorators/roles.decorator';
import { ProjectsService } from '@/projects/projects.service';
import { NoPermissionError } from '@/common/errors';

export class ThemesGuard implements CanActivate {
  private readonly reflector: Reflector;

  constructor(
    @Inject(ThemesService) private readonly themeService: ThemesService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
  ) {
    this.reflector = new Reflector();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();
    const args = ctx.getArgs();

    const themeId = args.themeId || args.data?.id;
    let projectId = args.projectId || args.data?.projectId;

    const user = req.user;
    const roles = this.reflector.get<RolesScopeEnum>(Roles, context.getHandler());

    if (themeId) {
      const theme = await this.themeService.getTheme(themeId);
      if (!theme || (projectId && theme && projectId !== theme.projectId)) {
        throw new NoPermissionError();
      }
      projectId = theme.projectId;
    }

    const userProject = await this.projectsService.getUserProject(user.id, projectId);
    if (!userProject || !roles.includes(userProject.role)) {
      throw new NoPermissionError();
    }

    return true;
  }
}
