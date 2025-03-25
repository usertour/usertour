import { CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { Roles, RolesScopeEnum } from '@/common/decorators/roles.decorator';
import { ProjectsService } from '@/projects/projects.service';
import { EventsService } from './events.service';
import { NoPermissionError } from '@/common/errors';

export class EventsGuard implements CanActivate {
  private readonly reflector: Reflector;

  constructor(
    @Inject(EventsService)
    private readonly eventsService: EventsService,
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
    const eventId = args.eventId || args.data?.id;

    const user = req.user;
    const roles = this.reflector.get<RolesScopeEnum>(Roles, context.getHandler());
    if (eventId) {
      const data = await this.eventsService.get(eventId);
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
