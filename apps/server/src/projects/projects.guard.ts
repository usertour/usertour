import { CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { Roles, RolesScopeEnum } from '@/common/decorators/roles.decorator';
import { ProjectsService } from '@/projects/projects.service';
import { NoPermissionError } from '@/common/errors';

export class ProjectsGuard implements CanActivate {
  private readonly reflector: Reflector;

  constructor(
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
  ) {
    this.reflector = new Reflector();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();
    const args = ctx.getArgs();

    const projectId = args.projectId || args.data?.projectId;
    if (!projectId) {
      throw new NoPermissionError('Project ID is required');
    }

    const user = req.user;
    const roles = this.reflector.get<RolesScopeEnum>(Roles, context.getHandler());

    const userProject = await this.projectsService.getUserProject(user.id, projectId);
    if (!userProject || !roles.includes(userProject.role)) {
      throw new NoPermissionError();
    }

    return true;
  }
}
