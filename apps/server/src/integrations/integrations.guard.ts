import { CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { Roles, RolesScopeEnum } from '@/common/decorators/roles.decorator';
import { ProjectsService } from '@/projects/projects.service';
import { NoPermissionError } from '@/common/errors';
import { IntegrationsService } from './integrations.service';

export class IntegrationsGuard implements CanActivate {
  private readonly reflector: Reflector;

  constructor(
    @Inject(IntegrationsService)
    private readonly integrationsService: IntegrationsService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
  ) {
    this.reflector = new Reflector();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();
    const args = ctx.getArgs();

    let projectId = args.projectId || args.data?.projectId;
    const integrationId = args.integrationId || args.data?.id;

    const user = req.user;
    const roles = this.reflector.get<RolesScopeEnum>(Roles, context.getHandler());
    if (integrationId) {
      const data = await this.integrationsService.get(integrationId);
      if (!data || (projectId && data && projectId !== data.projectId)) {
        throw new NoPermissionError();
      }
      projectId = data.projectId;
    }

    const userProject = await this.projectsService.getUserProject(user.id, projectId);
    if (!userProject || !roles.includes(userProject.role)) {
      throw new NoPermissionError();
    }

    return true;
  }
}
