import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Inject,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";

import { Roles, RolesScopeEnum } from "@/common/decorators/roles.decorator";
import { ProjectsService } from "@/projects/projects.service";
import { BizService } from "./biz.service";
import { EnvironmentsService } from "@/environments/environments.service";
import { BizUserOnSegment } from "@prisma/client";

export class BizGuard implements CanActivate {
  private readonly reflector: Reflector;

  constructor(
    @Inject(EnvironmentsService)
    private readonly environmentsService: EnvironmentsService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(BizService)
    private readonly bizservice: BizService
  ) {
    this.reflector = new Reflector();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    let { req } = ctx.getContext();
    let args = ctx.getArgs();

    let environmentId =
      args.environmentId ||
      args.data?.environmentId ||
      args.query?.environmentId;

    let segmentId = args.data?.id || args.data?.segmentId;

    const user = req.user;
    const roles = this.reflector.get<RolesScopeEnum>(
      Roles,
      context.getHandler()
    );
    if (!roles) {
      return true;
    }
    if (args.data?.userOnSegment && args.data.userOnSegment.length > 0) {
      segmentId = args.data.userOnSegment[0].segmentId;
    }
    if (args.data?.companyOnSegment && args.data.companyOnSegment.length > 0) {
      segmentId = args.data.companyOnSegment[0].segmentId;
    }
    if (segmentId) {
      const segment = await this.bizservice.getSegment(segmentId);
      if (segment) {
        environmentId = segment.environmentId;
      }
    }
    if (!environmentId) {
      throw new BadRequestException(
        "Please make sure you have permission to access this environment"
      );
    }
    const environment = await this.environmentsService.get(environmentId);
    if (!environment) {
      throw new BadRequestException(
        "Please make sure you have permission to access this environment"
      );
    }
    const projectId = environment.projectId;

    const userProject = await this.projectsService.getUserProject(
      user.id,
      projectId
    );
    if (!userProject || !roles.includes(userProject.role)) {
      throw new BadRequestException(
        "Please make sure you have permission to access this project"
      );
    }

    return true;
  }
}
