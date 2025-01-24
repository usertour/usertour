import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Inject,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";

import { Roles, RolesScopeEnum } from "@/common/decorators/roles.decorator";
import { EventsService } from "./events.service";
import { ProjectsService } from "@/projects/projects.service";

export class EventsGuard implements CanActivate {
  private readonly reflector: Reflector;

  constructor(
    @Inject(EventsService)
    private readonly eventsService: EventsService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService
  ) {
    this.reflector = new Reflector();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    let { req } = ctx.getContext();
    let args = ctx.getArgs();

    let eventId = args.eventId || args.data?.id,
      projectId = args.projectId || args.data?.projectId;

    const user = req.user;
    const roles = this.reflector.get<RolesScopeEnum>(
      Roles,
      context.getHandler()
    );
    if (!roles) {
      return true;
    }
    if (eventId) {
      const data = await this.eventsService.get(eventId);
      if (!data || (projectId && data && projectId != data.projectId)) {
        throw new BadRequestException(
          "Please make sure you have permission to access this event"
        );
      }
      projectId = data.projectId;
    }

    const userProject = await this.projectsService.getUserProject(
      user.id,
      projectId
    );
    if (!userProject || !roles.includes(userProject.role)) {
      throw new BadRequestException(
        "Please make sure you have permission to access this event"
      );
    }

    return true;
  }
}
