import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Reflector } from '@nestjs/core';
import { roleCan } from '@usertour/constants';
import { Capability, Role } from '@usertour/types';

import { AnalyticsResolver } from '@/analytics/analytics.resolver';
import { AttributesResolver } from '@/attributes/attributes.resolver';
import { BizResolver } from '@/biz/biz.resolver';
import { ContentResolver } from '@/content/content.resolver';
import { EnvironmentsResolver } from '@/environments/environments.resolver';
import { EventsResolver } from '@/events/events.resolver';
import { IntegrationResolver } from '@/integration/integration.resolver';
import { LocalizationsResolver } from '@/localizations/localizations.resolver';
import { ProjectsResolver } from '@/projects/projects.resolver';
import { TeamResolver } from '@/team/team.resolver';
import { ThemesResolver } from '@/themes/themes.resolver';

import { PermissionGuard } from './permission.guard';
import { RequirePermission, type RequiredPermission } from './require-permission.decorator';
import { ScopeKind } from './scope-resolver.registry';

/**
 * End-to-end authorization matrix: drives the REAL PermissionGuard (real scope
 * resolvers + real ROLE_CAPABILITIES) against every migrated endpoint's REAL
 * `@RequirePermission` metadata, for every role, with Prisma mocked so scope
 * resolves to a known project. Asserts the guard's allow/deny decision equals
 * `roleCan(role, capability)` for all 93 endpoints × 3 roles, plus that a
 * non-member (resource in a project the user isn't part of) is denied
 * everywhere. This is the live cross-product the per-piece unit tests can't
 * cover on their own.
 */

const PROJECT_ID = 'proj-A';
const projectIdRow = { projectId: PROJECT_ID };

// Mocked Prisma: every scope lookup resolves to PROJECT_ID.
const prisma: any = {
  environment: { findUnique: async () => projectIdRow },
  content: { findUnique: async () => projectIdRow },
  version: { findUnique: async () => ({ content: projectIdRow }) },
  step: { findUnique: async () => ({ version: { content: projectIdRow } }) },
  bizSession: { findUnique: async () => ({ content: projectIdRow }) },
  integration: { findUnique: async () => ({ environmentId: 'env-A' }) },
  integrationObjectMapping: {
    findUnique: async () => ({ integration: { environmentId: 'env-A' } }),
  },
  // project-level entities resolved by getEntityProjectId via prisma[model]
  attribute: { findUnique: async () => projectIdRow },
  theme: { findUnique: async () => projectIdRow },
  event: { findUnique: async () => projectIdRow },
  localization: { findUnique: async () => projectIdRow },
  segment: { findUnique: async () => projectIdRow },
};

// One arg fixture per ScopeKind that resolves to PROJECT_ID with the mock above.
const SCOPE_ARGS: Record<ScopeKind, Record<string, any>> = {
  [ScopeKind.Project]: { projectId: PROJECT_ID },
  [ScopeKind.Environment]: { environmentId: 'env-A' },
  [ScopeKind.Content]: { contentId: 'content-A' },
  [ScopeKind.Attribute]: { data: { id: 'attr-A' } },
  [ScopeKind.Theme]: { data: { id: 'theme-A' } },
  [ScopeKind.Event]: { data: { id: 'event-A' } },
  [ScopeKind.Localization]: { data: { id: 'loc-A' } },
  [ScopeKind.Segment]: { data: { segmentId: 'seg-A' } },
  [ScopeKind.Session]: { sessionId: 'session-A' },
  [ScopeKind.Integration]: { integrationId: 'int-A' },
};

const RESOLVERS: Record<string, new (...args: any[]) => any> = {
  analytics: AnalyticsResolver,
  attributes: AttributesResolver,
  biz: BizResolver,
  content: ContentResolver,
  environments: EnvironmentsResolver,
  events: EventsResolver,
  integration: IntegrationResolver,
  localizations: LocalizationsResolver,
  projects: ProjectsResolver,
  team: TeamResolver,
  themes: ThemesResolver,
};

interface Endpoint {
  key: string;
  required: RequiredPermission;
}

const reflector = new Reflector();
const endpoints: Endpoint[] = [];
for (const [moduleName, ResolverClass] of Object.entries(RESOLVERS)) {
  for (const method of Object.getOwnPropertyNames(ResolverClass.prototype)) {
    if (method === 'constructor') {
      continue;
    }
    const required = reflector.get(RequirePermission, ResolverClass.prototype[method]);
    if (required) {
      endpoints.push({ key: `${moduleName}.${method}`, required });
    }
  }
}

// Shared mutable request state so a single spy serves the whole matrix loop.
let currentArgs: Record<string, any> = {};
let currentRequired: RequiredPermission | undefined;
const user = { id: 'u1' };

beforeAll(() => {
  jest.spyOn(GqlExecutionContext, 'create').mockImplementation(
    () =>
      ({
        getContext: () => ({ req: { user } }),
        getArgs: () => currentArgs,
      }) as any,
  );
});

const makeGuard = (getUserProject: jest.Mock) => {
  const guard = new PermissionGuard({ getUserProject } as any, prisma);
  jest.spyOn((guard as any).reflector, 'get').mockImplementation(() => currentRequired);
  return guard;
};

const isAllowed = async (guard: PermissionGuard, ep: Endpoint): Promise<boolean> => {
  currentRequired = ep.required;
  currentArgs = SCOPE_ARGS[ep.required.scope];
  try {
    return (
      (await guard.canActivate({
        getHandler: () => () => undefined,
      } as unknown as ExecutionContext)) === true
    );
  } catch {
    return false;
  }
};

describe('endpoint authorization matrix', () => {
  it('reflected all 93 role-gated endpoints', () => {
    expect(endpoints.length).toBe(93);
  });

  for (const role of Object.values(Role)) {
    it(`grants/denies each endpoint for ${role} exactly per the matrix`, async () => {
      const guard = makeGuard(jest.fn().mockResolvedValue({ role }));
      const mismatches: string[] = [];
      for (const ep of endpoints) {
        const allowed = await isAllowed(guard, ep);
        const expected = roleCan(role, ep.required.capability as Capability);
        if (allowed !== expected) {
          mismatches.push(
            `${ep.key} (${ep.required.capability}): expected ${expected}, got ${allowed}`,
          );
        }
      }
      expect(mismatches).toEqual([]);
    });
  }

  it('denies every endpoint when the user is not a member of the resolved project', async () => {
    const guard = makeGuard(jest.fn().mockResolvedValue(null));
    const allowedAnyway: string[] = [];
    for (const ep of endpoints) {
      if (await isAllowed(guard, ep)) {
        allowedAnyway.push(ep.key);
      }
    }
    expect(allowedAnyway).toEqual([]);
  });
});
