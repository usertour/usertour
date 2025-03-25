import { CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { Roles, RolesScopeEnum } from '@/common/decorators/roles.decorator';
import { ContentsService } from '@/contents/contents.service';
import { EnvironmentsService } from '@/environments/environments.service';
import { ProjectsService } from '@/projects/projects.service';
import { NoPermissionError } from '@/common/errors';
import { AnalyticsService } from './analytics.service';
export class AnalyticsGuard implements CanActivate {
  private readonly reflector: Reflector;

  constructor(
    @Inject(EnvironmentsService)
    private readonly environmentsService: EnvironmentsService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(ContentsService)
    private readonly contentsService: ContentsService,
    @Inject(AnalyticsService)
    private readonly analyticsService: AnalyticsService,
  ) {
    this.reflector = new Reflector();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();
    const args = ctx.getArgs();

    let environmentId: undefined | string;

    const contentId = args.contentId || args.query?.contentId || args.data?.contentId;
    const sessionId = args.sessionId || args.query?.sessionId || args.data?.sessionId;

    const user = req.user;
    const roles = this.reflector.get<RolesScopeEnum>(Roles, context.getHandler());

    if (contentId) {
      const content = await this.contentsService.getContent(contentId);
      if (content) {
        environmentId = content.environmentId;
      }
    }
    if (sessionId) {
      const session = await this.analyticsService.getSession(sessionId);
      if (session) {
        environmentId = session.content.environmentId;
      }
    }
    if (!environmentId) {
      throw new NoPermissionError();
    }
    const environment = await this.environmentsService.get(environmentId);
    if (!environment) {
      throw new NoPermissionError();
    }
    const projectId = environment.projectId;

    const userProject = await this.projectsService.getUserProject(user.id, projectId);
    if (!userProject || !roles.includes(userProject.role)) {
      throw new NoPermissionError();
    }

    return true;
  }
}
