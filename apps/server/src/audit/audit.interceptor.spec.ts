import { Reflector } from '@nestjs/core';
import { Capability } from '@usertour/types';

import { AdminResolver } from '@/admin/admin.resolver';
import { AnalyticsResolver } from '@/analytics/analytics.resolver';
import { ApiCompaniesController } from '@/api/companies/companies.controller';
import { ApiSegmentMembersController } from '@/api/segments/segments.controller';
import { ApiTokenResolver } from '@/api-token/api-token.resolver';
import { ContentResolver } from '@/content/content.resolver';

import { Audit, AuditWeb } from './audit.decorator';
import {
  bodyEnvironmentId,
  buildWebAuditEntry,
  deriveAudit,
  fetchBefore,
  normalizeProjectIds,
  resolveResourceId,
  resolveWebAuditProjectIds,
} from './audit.interceptor';

describe('deriveAudit (v2 REST capability → audit descriptor)', () => {
  it('maps create/update/delete verbs directly', () => {
    expect(deriveAudit('content:create', 'POST')).toEqual({
      resourceType: 'content',
      action: 'create',
    });
    expect(deriveAudit('segment:update', 'PATCH')).toEqual({
      resourceType: 'segment',
      action: 'update',
    });
    expect(deriveAudit('theme:delete', 'DELETE')).toEqual({
      resourceType: 'theme',
      action: 'delete',
    });
  });

  it('maps publish and write (upsert) to update', () => {
    expect(deriveAudit('content:publish', 'POST')).toEqual({
      resourceType: 'content',
      action: 'update',
    });
    expect(deriveAudit('user:write', 'POST')).toEqual({ resourceType: 'user', action: 'update' });
    expect(deriveAudit('company:write', 'POST')).toEqual({
      resourceType: 'company',
      action: 'update',
    });
  });

  it('uses the HTTP method for the ambiguous `manage` verb', () => {
    expect(deriveAudit('environment:manage', 'POST')).toEqual({
      resourceType: 'environment',
      action: 'create',
    });
    expect(deriveAudit('environment:manage', 'PATCH')).toEqual({
      resourceType: 'environment',
      action: 'update',
    });
    expect(deriveAudit('environment:manage', 'DELETE')).toEqual({
      resourceType: 'environment',
      action: 'delete',
    });
    // Sessions are never "created" via the API; their only POST is the
    // action-shaped /:id/end, which the interceptor calls with hasPathId=true
    // (derived from req.params.id) — an update, not a create.
    expect(deriveAudit('session:manage', 'POST', true)).toEqual({
      resourceType: 'session',
      action: 'update',
    });
    // Same rule generalized: any id-carrying POST is an action, id-less is a create.
    expect(deriveAudit('webhook:manage', 'POST', true)).toEqual({
      resourceType: 'webhook',
      action: 'update',
    });
    expect(deriveAudit('webhook:manage', 'POST')).toEqual({
      resourceType: 'webhook',
      action: 'create',
    });
    expect(deriveAudit('session:manage', 'DELETE')).toEqual({
      resourceType: 'session',
      action: 'delete',
    });
  });

  it('returns null for read and non-audited capabilities (interceptor skips them)', () => {
    expect(deriveAudit('content:read', 'GET')).toBeNull();
    expect(deriveAudit('segment:read', 'GET')).toBeNull();
    expect(deriveAudit('project:manage', 'POST')).toBeNull(); // project not an audited resource
    expect(deriveAudit('billing:read', 'GET')).toBeNull();
  });
});

describe('capability coverage tripwire — every write capability derives or is consciously exempt', () => {
  // No v2 REST route carries these WRITE capabilities today — their lifecycles
  // are audited on the web surface via @AuditWeb instead. This test guards the
  // ENUM only: a brand-new capability must land in RESOURCE_BY_PREFIX or here.
  // It cannot see routes — the ROUTE-level guarantee (a new endpoint using one
  // of these exempt capabilities must derive or carry an explicit @Audit) is
  // audit-route-coverage.spec.ts, which scans the actual controllers.
  const EXEMPT_WRITE_PREFIXES = new Set([
    'localization', // v2 exposure deferred; web mutations carry @AuditWeb
    'accesstoken', // SDK-token lifecycle is web-only (@AuditWeb access_token)
    'integration', // web-only mutations (@AuditWeb integration)
    'project', // web-only mutations (@AuditWeb project)
    'billing', // web-only (updateProjectLicense carries @AuditWeb)
    'team', // web-only mutations (@AuditWeb member)
    'sso', // web-only mutations (@AuditWeb sso_provider)
  ]);
  // `activate` = switching the active project in the UI — the adjudicated
  // unaudited activeUserProject, not a durable write.
  const NON_WRITE_VERBS = new Set(['read', 'activate']);

  it('derives a descriptor for every non-exempt write capability', () => {
    for (const cap of Object.values(Capability)) {
      const [prefix, verb] = String(cap).split(':');
      if (NON_WRITE_VERBS.has(verb) || EXEMPT_WRITE_PREFIXES.has(prefix)) {
        continue;
      }
      // Wrap in an object so a failure names the offending capability.
      expect({ cap, derived: deriveAudit(String(cap), 'POST') }).toEqual({
        cap,
        derived: expect.objectContaining({ resourceType: expect.any(String) }),
      });
    }
  });
});

describe('buildWebAuditEntry capture override (bulk mutations)', () => {
  it('stores the captured args-derived payload as `after` instead of the raw result', () => {
    const entry = buildWebAuditEntry(
      undefined,
      { data: { ids: ['u1', 'u2', 'u3'], environmentId: 'env1' } },
      { success: true, count: 3 },
      {
        action: 'delete',
        resourceType: 'user',
        resourceId: (a) => String((a.data as { ids: string[] }).ids.length),
        capture: (a, r) => ({
          deletedBizUserIds: (a.data as { ids: string[] }).ids,
          count: (r as { count: number }).count,
        }),
      },
      { projectId: 'p1', environmentId: 'env1', operation: 'deleteBizUser', before: undefined },
    );
    expect(entry.after).toEqual({ deletedBizUserIds: ['u1', 'u2', 'u3'], count: 3 });
    expect(entry.resourceId).toBe('3');
    expect(entry.operation).toBe('deleteBizUser');
  });

  it('falls back to the raw result when no capture is given', () => {
    const entry = buildWebAuditEntry(
      undefined,
      { id: 'x' },
      { id: 'x', name: 'after' },
      { action: 'update', resourceType: 'segment' },
      { projectId: 'p1', environmentId: null, operation: 'op', before: undefined },
    );
    expect(entry.after).toEqual({ id: 'x', name: 'after' });
  });
});

describe('web publish audit meta reads the returned Content row', () => {
  it('publishedContentVersion resourceId uses result.id (the mutation returns Content, not Version)', () => {
    // Reading `result.contentId` here yields undefined → the required resourceId
    // column write fails → the audit row for every web publish is silently lost.
    const meta = new Reflector().get(AuditWeb, ContentResolver.prototype.publishedContentVersion);
    expect(meta).toBeDefined();
    const contentRow = { id: 'c1', editedVersionId: 'v9' }; // a Content row has no contentId
    expect(meta.resourceId?.({}, contentRow)).toBe('c1');
  });
});

describe('fetchBefore biz-entity id spaces (REST externalId vs web internal id)', () => {
  const prisma = {
    bizUser: {
      findFirst: async ({ where }: { where: { externalId: string } }) =>
        where.externalId === 'ext-jane' ? { id: 'bu1', externalId: 'ext-jane' } : null,
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === 'bu-internal' ? { id: 'bu-internal', externalId: 'ext-jane' } : null,
    },
    bizCompany: {
      findFirst: async ({ where }: { where: { externalId: string } }) =>
        where.externalId === 'ext-acme' ? { id: 'bc1' } : null,
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === 'bc-internal' ? { id: 'bc-internal' } : null,
    },
  } as never;

  it('resolves a user by externalId (the REST/MCP path)', async () => {
    const row = await fetchBefore('user', 'delete', { id: 'ext-jane' }, 'env1', prisma);
    expect(row).toMatchObject({ id: 'bu1' });
  });

  it('falls back to the internal id (the web-admin delete path)', async () => {
    const row = await fetchBefore('user', 'delete', { id: 'bu-internal' }, 'env1', prisma);
    expect(row).toMatchObject({ id: 'bu-internal' });
  });

  it('company: external first, internal fallback', async () => {
    expect(
      await fetchBefore('company', 'delete', { id: 'ext-acme' }, 'env1', prisma),
    ).toMatchObject({ id: 'bc1' });
    expect(
      await fetchBefore('company', 'delete', { id: 'bc-internal' }, 'env1', prisma),
    ).toMatchObject({ id: 'bc-internal' });
  });
});

describe('bodyEnvironmentId — the body fallback is fenced to publish-verb routes', () => {
  it('reads the body env for publish/unpublish (the routes that validate it)', () => {
    expect(bodyEnvironmentId('content:publish', { environmentId: 'env1' })).toBe('env1');
  });

  it('ignores a stray body environmentId on every other capability', () => {
    // The exact pollution path: interceptors run before the zod pipes (and
    // body-less DELETE/restore routes never run them), so req.body is
    // unvalidated here. A stray key must not label the entry with an
    // environment the write never touched.
    expect(bodyEnvironmentId('content:update', { environmentId: 'evil' })).toBeNull();
    expect(bodyEnvironmentId('theme:delete', { environmentId: 'evil' })).toBeNull();
    expect(bodyEnvironmentId(undefined, { environmentId: 'evil' })).toBeNull();
  });

  it('returns null for a missing or non-string value', () => {
    expect(bodyEnvironmentId('content:publish', undefined)).toBeNull();
    expect(bodyEnvironmentId('content:publish', { environmentId: 42 })).toBeNull();
  });
});

describe('resolveResourceId — create attributes to the created resource, not a path id', () => {
  it('a create prefers result.id over params.id (POST /:id/duplicate names the COPY, not the source)', () => {
    // params.id is the SOURCE content; the created copy's id is in the result.
    expect(resolveResourceId({ id: 'SRC' }, { id: 'NEW' }, 'create')).toBe('NEW');
  });

  it('contentId outranks id: version routes record the CONTENT, not the version', () => {
    // PATCH /content/:contentId/versions/:id derives resourceType 'content';
    // MCP/web record the content id for the same operation — params.id (the
    // version) winning here would split the per-content history in two.
    expect(resolveResourceId({ contentId: 'C', id: 'V' }, { id: 'V' }, 'update')).toBe('C');
  });

  it('a plain create (no path id) still uses result.id', () => {
    expect(resolveResourceId({}, { id: 'NEW' }, 'create')).toBe('NEW');
  });

  it('update/delete keep the path id (the action targets the resource in the path)', () => {
    expect(resolveResourceId({ id: 'X' }, { id: 'Y' }, 'update')).toBe('X');
    expect(resolveResourceId({ contentId: 'C' }, { id: 'Y' }, 'delete')).toBe('C');
  });

  it('falls back to result.id when a create has no usable result id, then empty string', () => {
    expect(resolveResourceId({ id: 'SRC' }, {}, 'create')).toBe('SRC'); // no result.id → path
    expect(resolveResourceId({}, undefined, 'create')).toBe('');
  });
});

describe('normalizeProjectIds — multi-project audit attribution', () => {
  it('keeps every id from an array (a key scoped to several projects logs into each)', () => {
    expect(normalizeProjectIds(['pA', 'pB'])).toEqual(['pA', 'pB']);
  });

  it('wraps a single id and drops empties/nullish', () => {
    expect(normalizeProjectIds('pA')).toEqual(['pA']);
    expect(normalizeProjectIds(null)).toEqual([]);
    expect(normalizeProjectIds(undefined)).toEqual([]);
    expect(normalizeProjectIds(['pA', '', 'pB'])).toEqual(['pA', 'pB']);
  });

  it('dedupes repeated ids so one write logs one audit row per project', () => {
    // createApiToken's resolver hands back the RAW input array; a repeated id
    // would otherwise write the same audit entry twice for a single creation.
    expect(normalizeProjectIds(['pA', 'pA'])).toEqual(['pA']);
    expect(normalizeProjectIds(['pA', 'pB', 'pA'])).toEqual(['pA', 'pB']);
  });
});

describe('createApiToken audit meta attributes to ALL scoped projects', () => {
  it('resolveProjectId returns the full projectIds array (not just the first)', async () => {
    const meta = new Reflector().get(AuditWeb, ApiTokenResolver.prototype.createApiToken);
    expect(meta).toBeDefined();
    const projects = await meta.resolveProjectId?.(
      { input: { projectIds: ['pA', 'pB'] } },
      {} as never,
    );
    expect(projects).toEqual(['pA', 'pB']);
  });
});

describe('resolveWebAuditProjectIds — resolver wins over the guard stash', () => {
  const prisma = {} as never;

  it("uses the resolver's project(s) and IGNORES a stash from an earlier field", async () => {
    // The exact bug: a guarded updateContent(P1) ran earlier in the same
    // document and stashed req.auditProjectId = P1; createApiToken is account-
    // level (projectIds:[P2]). The entry must land in P2, not P1.
    const meta = { resolveProjectId: async () => ['P2'] };
    expect(await resolveWebAuditProjectIds(meta, {}, 'P1', prisma)).toEqual(['P2']);
  });

  it('keeps every project of a multi-project resolver', async () => {
    const meta = { resolveProjectId: async () => ['P2', 'P3'] };
    expect(await resolveWebAuditProjectIds(meta, {}, 'P1', prisma)).toEqual(['P2', 'P3']);
  });

  it('falls back to the stash for a resource mutation with no resolver', async () => {
    expect(await resolveWebAuditProjectIds({}, {}, 'P1', prisma)).toEqual(['P1']);
  });

  it('falls back to the stash when the resolver yields nothing (e.g. row already gone)', async () => {
    const meta = { resolveProjectId: async () => undefined };
    expect(await resolveWebAuditProjectIds(meta, {}, 'P1', prisma)).toEqual(['P1']);
  });

  it('drops the entry (no stash fallback) when a declared resolver THROWS', async () => {
    // The stash may belong to a different field of the same document — even one
    // the actor was denied on. Wrong-project attribution misleads forensics
    // worse than a loudly-logged missing row does.
    const onError = jest.fn();
    const meta = {
      resolveProjectId: async () => {
        throw new Error('boom');
      },
    };
    expect(await resolveWebAuditProjectIds(meta, {}, 'P1', prisma, onError)).toEqual([]);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('returns [] when neither source resolves (the wiring-bug case)', async () => {
    expect(await resolveWebAuditProjectIds({}, {}, undefined, prisma)).toEqual([]);
  });
});

describe('v2 membership routes override the capability derivation', () => {
  // Deriving from company:write / segment:update would record "company/segment
  // updated" with the member id nowhere — "who removed user U" would be
  // answerable on v1/MCP/web but not v2. The explicit @Audit mirrors v1's and
  // MCP's composite descriptor.
  const reflector = new Reflector();

  it.each([
    ['add', ApiCompaniesController.prototype.upsertMembership, 'update'],
    ['remove', ApiCompaniesController.prototype.removeMembership, 'delete'],
  ])('company member %s records companyMember userId:companyId', (_label, handler, action) => {
    const meta = reflector.get(Audit, handler);
    expect(meta).toMatchObject({ action, resourceType: 'companyMember' });
    expect(
      meta.resourceId?.({ method: 'PUT', params: { id: 'acme', userId: 'jane' } }, undefined),
    ).toBe('jane:acme');
  });

  it.each([
    ['add', ApiSegmentMembersController.prototype.add, 'update'],
    ['remove', ApiSegmentMembersController.prototype.remove, 'delete'],
  ])('segment member %s records segmentMember segmentId:externalId', (_label, handler, action) => {
    const meta = reflector.get(Audit, handler);
    expect(meta).toMatchObject({ action, resourceType: 'segmentMember' });
    expect(
      meta.resourceId?.({ method: 'PUT', params: { id: 'seg1', externalId: 'jane' } }, undefined),
    ).toBe('seg1:jane');
  });
});

describe('web session and admin member mutations carry @AuditWeb', () => {
  const reflector = new Reflector();

  it('deleteSession/endSession are audited (the one surface that was trace-free)', () => {
    const del = reflector.get(AuditWeb, AnalyticsResolver.prototype.deleteSession);
    expect(del).toMatchObject({ action: 'delete', resourceType: 'session' });
    expect(del.resourceId?.({ sessionId: 's1' }, undefined)).toBe('s1');

    const end = reflector.get(AuditWeb, AnalyticsResolver.prototype.endSession);
    expect(end).toMatchObject({ action: 'update', resourceType: 'session' });
    expect(end.resourceId?.({ sessionId: 's1' }, undefined)).toBe('s1');
  });

  it.each([
    ['adminAddProjectMember', 'create'],
    ['adminChangeProjectMemberRole', 'update'],
    ['adminTransferProjectOwnership', 'update'],
    ['adminRemoveProjectMember', 'delete'],
  ] as const)('%s records member %s attributed via its own projectId arg', async (name, action) => {
    // SystemAdminGuard stashes no projectId (it is not PermissionGuard) — without
    // resolveProjectId the interceptor logs a wiring error and drops the entry.
    const meta = reflector.get(
      AuditWeb,
      AdminResolver.prototype[name as keyof AdminResolver] as (...args: never[]) => unknown,
    );
    expect(meta).toMatchObject({ action, resourceType: 'member' });
    expect(meta.resourceId?.({ userId: 'u1', projectId: 'p1' }, undefined)).toBe('u1');
    await expect(meta.resolveProjectId?.({ projectId: 'p1' }, {} as never)).resolves.toBe('p1');
  });
});
