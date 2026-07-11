import { Reflector } from '@nestjs/core';

import { ContentResolver } from '@/content/content.resolver';
import { ApiTokenResolver } from '@/api-token/api-token.resolver';

import { AuditWeb } from './audit.decorator';
import {
  buildWebAuditEntry,
  deriveAudit,
  fetchBefore,
  normalizeProjectIds,
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
    // sessions are never "created" via the API; manage+POST (e.g. /:id/end) is an update.
    expect(deriveAudit('session:manage', 'POST')).toEqual({
      resourceType: 'session',
      action: 'update',
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

  it('reports the resolver error and falls back to the stash instead of crashing', async () => {
    const onError = jest.fn();
    const meta = {
      resolveProjectId: async () => {
        throw new Error('boom');
      },
    };
    expect(await resolveWebAuditProjectIds(meta, {}, 'P1', prisma, onError)).toEqual(['P1']);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('returns [] when neither source resolves (the wiring-bug case)', async () => {
    expect(await resolveWebAuditProjectIds({}, {}, undefined, prisma)).toEqual([]);
  });
});
