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
import { EnvironmentsService } from "@/environments/environments.service";
import { ContentsService } from "@/contents/contents.service";
import { LocalizationsService } from "@/localizations/localizations.service";

export class ContentsGuard implements CanActivate {
  private readonly reflector: Reflector;

  constructor(
    @Inject(EnvironmentsService)
    private readonly environmentsService: EnvironmentsService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(ContentsService)
    private readonly contentsService: ContentsService,
    @Inject(LocalizationsService)
    private readonly localizationsService: LocalizationsService
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

    let contentId =
      args.contentId || args.query?.contentId || args.data?.contentId;

    let versionId =
      args.versionId || args.query?.versionId || args.data?.versionId;

    let localizationId =
      args.localizationId ||
      args.query?.localizationId ||
      args.data?.localizationId;

    let stepId = args.stepId;

    const user = req.user;
    const roles = this.reflector.get<RolesScopeEnum>(
      Roles,
      context.getHandler()
    );
    if (!roles) {
      return false;
    }
    if (contentId) {
      const content = await this.contentsService.getContent(contentId);
      if (content) {
        if (environmentId && environmentId != content.environmentId) {
          throw new BadRequestException("The request is invalid!");
        }
        environmentId = content.environmentId;
      }
    }
    if (versionId) {
      const version = await this.contentsService.getContentVersion(versionId);
      if (version?.content) {
        if (environmentId && environmentId != version.content.environmentId) {
          throw new BadRequestException("The request is invalid!");
        }
        environmentId = version.content.environmentId;
      }
    }
    if (stepId) {
      const stepContent = await this.contentsService.getContentByStepId(stepId);
      if (stepContent) {
        if (environmentId && environmentId != stepContent.environmentId) {
          throw new BadRequestException("The request is invalid!");
        }
        environmentId = stepContent.environmentId;
      }
    }

    if (!environmentId) {
      throw new BadRequestException(
        "Please make sure you have permission to access this project"
      );
    }
    const environment = await this.environmentsService.get(environmentId);
    if (!environment) {
      throw new BadRequestException(
        "Please make sure you have permission to access this project"
      );
    }
    const projectId = environment.projectId;

    if (localizationId) {
      const localization = await this.localizationsService.get(localizationId);
      if (localization) {
        if (projectId && projectId != localization.projectId) {
          throw new BadRequestException("The request is invalid!");
        }
      }
    }

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
