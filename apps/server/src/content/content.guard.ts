import { CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { Roles, RolesScopeEnum } from '@/common/decorators/roles.decorator';
import { ContentService } from '@/content/content.service';
import { EnvironmentsService } from '@/environments/environments.service';
import { LocalizationsService } from '@/localizations/localizations.service';
import { ProjectsService } from '@/projects/projects.service';
import { NoPermissionError } from '@/common/errors';

export class ContentGuard implements CanActivate {
  private readonly reflector: Reflector;

  constructor(
    @Inject(EnvironmentsService)
    private readonly environmentsService: EnvironmentsService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(ContentService)
    private readonly contentService: ContentService,
    @Inject(LocalizationsService)
    private readonly localizationsService: LocalizationsService,
  ) {
    this.reflector = new Reflector();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();
    const args = ctx.getArgs();

    let environmentId = args.environmentId || args.data?.environmentId || args.query?.environmentId;

    const contentId = args.contentId || args.query?.contentId || args.data?.contentId;

    const versionId = args.versionId || args.query?.versionId || args.data?.versionId;

    const localizationId =
      args.localizationId || args.query?.localizationId || args.data?.localizationId;

    const stepId = args.stepId;

    const user = req.user;
    const roles = this.reflector.get<RolesScopeEnum>(Roles, context.getHandler());
    if (contentId) {
      const content = await this.contentService.getContent(contentId);
      if (content) {
        environmentId = content.environmentId;
      }
    }
    if (versionId) {
      const version = await this.contentService.getContentVersion(versionId);
      if (version?.content) {
        environmentId = version.content.environmentId;
      }
    }
    if (stepId) {
      const stepContent = await this.contentService.getContentByStepId(stepId);
      if (stepContent) {
        environmentId = stepContent.environmentId;
      }
    }

    if (!environmentId) {
      throw new NoPermissionError();
    }
    const environment = await this.environmentsService.get(environmentId);
    if (!environment) {
      throw new NoPermissionError();
    }

    // Check if the target environment is in the same project
    if (args.data?.targetEnvironmentId) {
      const targetEnvironment = await this.environmentsService.get(args.data.targetEnvironmentId);
      if (!targetEnvironment || environment.projectId !== targetEnvironment.projectId) {
        throw new NoPermissionError();
      }
    }
    const projectId = environment.projectId;

    if (localizationId) {
      const localization = await this.localizationsService.get(localizationId);
      if (localization) {
        if (projectId && projectId !== localization.projectId) {
          throw new NoPermissionError();
        }
      }
    }

    const userProject = await this.projectsService.getUserProject(user.id, projectId);
    if (!userProject || !roles.includes(userProject.role)) {
      throw new NoPermissionError();
    }

    return true;
  }
}
