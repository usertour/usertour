import { buildWebAuditEntry, deriveAudit } from './audit.interceptor';

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
