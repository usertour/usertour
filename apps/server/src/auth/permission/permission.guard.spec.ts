import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Capability } from '@usertour/types';

import { NoPermissionError } from '@/common/errors';

import { PermissionGuard } from './permission.guard';
import { ScopeKind } from './scope-resolver.registry';

/**
 * Exercises the assembled guard (scope resolution → membership → roleCan)
 * with mocked Prisma + ProjectsService — the wiring that the matrix and
 * scope unit tests can't see on their own. Covers per-role allow/deny and,
 * critically, the cross-project denial invariant.
 */
describe('PermissionGuard.canActivate', () => {
  // proj-1 owns env-1; proj-2 owns env-2. The user is a member of proj-1 only.
  const prisma = {
    environment: {
      findUnique: jest.fn(({ where }: any) =>
        Promise.resolve(
          where.id === 'env-1'
            ? { projectId: 'proj-1' }
            : where.id === 'env-2'
              ? { projectId: 'proj-2' }
              : null,
        ),
      ),
    },
  };
  const getUserProject = jest.fn();
  const projectsService = { getUserProject } as any;

  const guard = new PermissionGuard(projectsService, prisma as any);

  const invoke = (params: {
    scope: ScopeKind;
    capability: Capability;
    args: Record<string, any>;
    user?: { id: string };
  }) => {
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => ({ req: { user: params.user ?? { id: 'u1' } } }),
      getArgs: () => params.args,
    } as any);
    jest
      .spyOn((guard as any).reflector, 'get')
      .mockReturnValue({ capability: params.capability, scope: params.scope });
    return guard.canActivate({ getHandler: () => () => undefined } as unknown as ExecutionContext);
  };

  beforeEach(() => {
    // Default: u1 is a VIEWER of proj-1, member of nothing else.
    getUserProject.mockImplementation((_userId: string, projectId: string) =>
      Promise.resolve(projectId === 'proj-1' ? { role: 'VIEWER' } : null),
    );
  });

  it('allows a read capability for VIEWER (project scope)', async () => {
    await expect(
      invoke({
        scope: ScopeKind.Project,
        capability: Capability.ProjectRead,
        args: { projectId: 'proj-1' },
      }),
    ).resolves.toBe(true);
  });

  it('denies a write capability for VIEWER', async () => {
    await expect(
      invoke({
        scope: ScopeKind.Project,
        capability: Capability.AttributeCreate,
        args: { projectId: 'proj-1' },
      }),
    ).rejects.toBeInstanceOf(NoPermissionError);
  });

  it('allows a write capability for ADMIN via environment scope', async () => {
    getUserProject.mockResolvedValue({ role: 'ADMIN' });
    await expect(
      invoke({
        scope: ScopeKind.Environment,
        capability: Capability.BizdataDelete,
        args: { environmentId: 'env-1' },
      }),
    ).resolves.toBe(true);
  });

  it('denies an owner-only capability for ADMIN', async () => {
    getUserProject.mockResolvedValue({ role: 'ADMIN' });
    await expect(
      invoke({
        scope: ScopeKind.Project,
        capability: Capability.TeamManage,
        args: { projectId: 'proj-1' },
      }),
    ).rejects.toBeInstanceOf(NoPermissionError);
  });

  it('denies cross-project access (resource resolves to a project the user is not a member of)', async () => {
    // u1 is only a member of proj-1; the resource (env-2) belongs to proj-2.
    await expect(
      invoke({
        scope: ScopeKind.Environment,
        capability: Capability.BizdataRead,
        args: { environmentId: 'env-2' },
      }),
    ).rejects.toBeInstanceOf(NoPermissionError);
    expect(getUserProject).toHaveBeenCalledWith('u1', 'proj-2');
  });

  it('denies when no capability is required only if metadata present; passes through when absent', async () => {
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => ({ req: { user: { id: 'u1' } } }),
      getArgs: () => ({}),
    } as any);
    jest.spyOn((guard as any).reflector, 'get').mockReturnValue(undefined);
    await expect(
      guard.canActivate({ getHandler: () => () => undefined } as unknown as ExecutionContext),
    ).resolves.toBe(true);
  });
});
