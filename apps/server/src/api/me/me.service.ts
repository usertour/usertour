import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import {
  AuthedApiToken,
  environmentAllowlistOf,
  intersectEnvironmentAllowlists,
  membershipEnvironmentCeiling,
} from '@/api-token/api-token-auth.service';
import { ApiObjectType } from '../shared/object-type';
import { MeResponseDto } from './me.schema';

/**
 * Resolves what an authenticated token may act on, mirroring the guard's
 * three-dimensional rule (project ∈ token scope AND live membership;
 * environment ∈ token.allowedEnvironmentIds ∩ the owner's membership
 * ceiling — both via the guard's own shared helpers). Errs on the side of
 * listing LESS: an environment shown here but refused by the guard would
 * strand integration setups on a 403 the user can't explain — projects
 * without a live membership are filtered, not thrown.
 */
@Injectable()
export class ApiMeService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(token: AuthedApiToken): Promise<MeResponseDto> {
    const projectIds = token.projects
      .map((link) => link.projectId)
      .filter((id): id is string => Boolean(id));

    // One relational query: the membership filter and the membership row
    // itself ride the same `users` relation.
    const projects = projectIds.length
      ? await this.prisma.project.findMany({
          where: { id: { in: projectIds }, users: { some: { userId: token.userId } } },
          select: {
            id: true,
            name: true,
            users: {
              where: { userId: token.userId },
              select: { role: true, allowedEnvironmentIds: true },
            },
            environments: {
              where: { deleted: false },
              select: { id: true, name: true },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    const tokenAllowed = environmentAllowlistOf(token.allowedEnvironmentIds);

    return {
      object: ApiObjectType.ME as const,
      tokenName: token.name,
      projects: projects.map((project) => {
        const membership = project.users[0];
        const ceiling = membership ? membershipEnvironmentCeiling(membership) : null;
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
