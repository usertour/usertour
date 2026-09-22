import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import {
  AuthedApiToken,
  environmentAllowlistOf,
} from '@/modules/api-token/services/api-token-auth.service';
import { ApiObjectType } from '../shared/object-type';
import { MeResponseDto } from './me.schema';

/**
 * Resolves what an authenticated token may act on, mirroring the guard's
 * rule (project ∈ token scope AND live membership; environment ∈
 * token.allowedEnvironmentIds — via the guard's own shared helper). Errs on
 * the side of listing LESS: an environment shown here but refused by the
 * guard would strand integration setups on a 403 the user can't explain —
 * projects without a live membership are filtered, not thrown. The owner's
 * EDITOR publish whitelist is not an environment scope (reads and other
 * writes are unrestricted) so it is not reflected here; publishing outside
 * it is refused per call (E1039).
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
        const environments = tokenAllowed
          ? project.environments.filter((environment) => tokenAllowed.includes(environment.id))
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
