import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import {
  AuthedApiToken,
  environmentAllowlistOf,
  intersectEnvironmentAllowlists,
} from '@/api-token/api-token-auth.service';
import { ApiObjectType } from '../shared/object-type';
import { MeResponseDto } from './me.schema';

/**
 * Resolves what an authenticated token may act on, mirroring the guard's
 * three-dimensional rule (project ∈ token scope AND live membership;
 * environment ∈ token.allowedEnvironmentIds ∩ the owner's membership
 * ceiling). Errs on the side of listing LESS: an environment shown here but
 * refused by the guard would strand integration setups on a 403 the user
 * can't explain — projects without a live membership are filtered, not
 * thrown.
 */
@Injectable()
export class ApiMeService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(token: AuthedApiToken): Promise<MeResponseDto> {
    const projectIds = token.projects
      .map((link) => link.projectId)
      .filter((id): id is string => Boolean(id));

    const memberships = projectIds.length
      ? await this.prisma.userOnProject.findMany({
          where: { userId: token.userId, projectId: { in: projectIds } },
        })
      : [];
    const membershipByProject = new Map(
      memberships.map((membership) => [membership.projectId, membership]),
    );

    const projects = await this.prisma.project.findMany({
      where: { id: { in: [...membershipByProject.keys()] } },
      select: {
        id: true,
        name: true,
        environments: {
          where: { deleted: false },
          select: { id: true, name: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const tokenAllowed = environmentAllowlistOf(token.allowedEnvironmentIds);

    return {
      object: ApiObjectType.ME as const,
      tokenName: token.name,
      projects: projects.map((project) => {
        const membership = membershipByProject.get(project.id);
        const ceiling =
          membership?.role === 'OWNER'
            ? null
            : environmentAllowlistOf(membership?.allowedEnvironmentIds);
        const allowed = intersectEnvironmentAllowlists(tokenAllowed, ceiling);
        const environments = allowed
          ? project.environments.filter((environment) => allowed.includes(environment.id))
          : project.environments;
        return {
          id: project.id,
          object: ApiObjectType.PROJECT as const,
          name: project.name,
          environments: environments.map((environment) => ({
            id: environment.id,
            object: ApiObjectType.ENVIRONMENT as const,
            name: environment.name ?? '',
          })),
        };
      }),
    };
  }
}
