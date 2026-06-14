import { deriveAudit } from './audit.interceptor';

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
