import { NoPermissionError } from '@/common/errors';

import { ScopeKind, type ScopeServices, createScopeResolvers } from './scope-resolver.registry';

describe('scope resolvers', () => {
  const services: ScopeServices = {
    getEntityProjectId: async (model, id) =>
      model === 'attribute' && id === 'attr-1' ? 'proj-1' : null,
    getEnvironmentProjectId: async (environmentId) => (environmentId === 'env-1' ? 'proj-1' : null),
    getContentEnvironmentId: async (contentId) => (contentId === 'content-1' ? 'env-1' : null),
    getVersionEnvironmentId: async (versionId) => (versionId === 'version-1' ? 'env-1' : null),
  };
  const resolvers = createScopeResolvers(services);

  describe('Project', () => {
    it('reads projectId from args / data / query', async () => {
      expect(await resolvers[ScopeKind.Project]({ projectId: 'proj-1' })).toBe('proj-1');
      expect(await resolvers[ScopeKind.Project]({ data: { projectId: 'proj-2' } })).toBe('proj-2');
      expect(await resolvers[ScopeKind.Project]({})).toBeNull();
    });
  });

  describe('Attribute (project-level entity)', () => {
    it('derives project from the entity id (update/delete)', async () => {
      expect(await resolvers[ScopeKind.Attribute]({ data: { id: 'attr-1' } })).toBe('proj-1');
    });

    it('falls back to explicit projectId when there is no id (create/list)', async () => {
      expect(await resolvers[ScopeKind.Attribute]({ projectId: 'proj-9' })).toBe('proj-9');
    });

    it('returns null for an unknown entity id', async () => {
      expect(await resolvers[ScopeKind.Attribute]({ data: { id: 'nope' } })).toBeNull();
    });

    it('throws when a client-supplied projectId disagrees with the derived one', async () => {
      await expect(
        resolvers[ScopeKind.Attribute]({ data: { id: 'attr-1' }, projectId: 'other' }),
      ).rejects.toBeInstanceOf(NoPermissionError);
    });
  });

  describe('Environment', () => {
    it('derives project from environmentId', async () => {
      expect(await resolvers[ScopeKind.Environment]({ environmentId: 'env-1' })).toBe('proj-1');
    });

    it('returns null when environment is unknown / absent', async () => {
      expect(await resolvers[ScopeKind.Environment]({ environmentId: 'nope' })).toBeNull();
      expect(await resolvers[ScopeKind.Environment]({})).toBeNull();
    });

    it('throws when a client-supplied projectId disagrees with the derived one', async () => {
      await expect(
        resolvers[ScopeKind.Environment]({ environmentId: 'env-1', projectId: 'other' }),
      ).rejects.toBeInstanceOf(NoPermissionError);
    });
  });

  describe('Content', () => {
    it('derives project from contentId → environment', async () => {
      expect(await resolvers[ScopeKind.Content]({ contentId: 'content-1' })).toBe('proj-1');
    });

    it('derives project from versionId → environment', async () => {
      expect(await resolvers[ScopeKind.Content]({ data: { versionId: 'version-1' } })).toBe(
        'proj-1',
      );
    });

    it('throws on cross-project projectId mismatch', async () => {
      await expect(
        resolvers[ScopeKind.Content]({ contentId: 'content-1', projectId: 'other' }),
      ).rejects.toBeInstanceOf(NoPermissionError);
    });
  });
});
