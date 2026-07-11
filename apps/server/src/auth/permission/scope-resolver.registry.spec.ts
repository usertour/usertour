import { NoPermissionError } from '@/common/errors';

import { ScopeKind, type ScopeServices, createScopeResolvers } from './scope-resolver.registry';

describe('scope resolvers', () => {
  // proj-1 owns env-1 and entities *-1; proj-2 owns env-2 (for cross-project checks).
  const services: ScopeServices = {
    getEntityProjectId: async (model, id) => {
      if (model === 'attribute' && id === 'attr-1') return 'proj-1';
      if (model === 'segment' && id === 'seg-1') return 'proj-1';
      if (model === 'localization' && id === 'loc-1') return 'proj-1';
      if (model === 'localization' && id === 'loc-2') return 'proj-2';
      return null;
    },
    getEnvironmentProjectId: async (environmentId) =>
      environmentId === 'env-1' ? 'proj-1' : environmentId === 'env-2' ? 'proj-2' : null,
    getContentProjectId: async (contentId) => (contentId === 'content-1' ? 'proj-1' : null),
    getVersionProjectId: async (versionId) => (versionId === 'version-1' ? 'proj-1' : null),
    getStepProjectId: async (stepId) => (stepId === 'step-1' ? 'proj-1' : null),
    getSessionScope: async (sessionId) =>
      sessionId === 'session-1' ? { projectId: 'proj-1', environmentId: 'env-1' } : null,
    getIntegrationEnvironmentId: async (integrationId) =>
      integrationId === 'int-1' ? 'env-1' : null,
    getMappingEnvironmentId: async (mappingId) => (mappingId === 'map-1' ? 'env-1' : null),
  };
  const resolvers = createScopeResolvers(services);

  describe('Project', () => {
    it('reads projectId from args / data / query', async () => {
      expect(await resolvers[ScopeKind.Project]({ projectId: 'proj-1' })).toMatchObject({
        projectId: 'proj-1',
      });
      expect(await resolvers[ScopeKind.Project]({ data: { projectId: 'proj-2' } })).toMatchObject({
        projectId: 'proj-2',
      });
      expect(await resolvers[ScopeKind.Project]({})).toBeNull();
    });
  });

  describe('Attribute (project-level entity)', () => {
    it('derives project from the entity id (update/delete)', async () => {
      expect(await resolvers[ScopeKind.Attribute]({ data: { id: 'attr-1' } })).toMatchObject({
        projectId: 'proj-1',
      });
    });
    it('falls back to explicit projectId when there is no id (create/list)', async () => {
      expect(await resolvers[ScopeKind.Attribute]({ projectId: 'proj-9' })).toMatchObject({
        projectId: 'proj-9',
      });
    });
    it('returns null for an unknown entity id', async () => {
      expect(await resolvers[ScopeKind.Attribute]({ data: { id: 'nope' } })).toBeNull();
    });
    it('throws when a client-supplied projectId disagrees', async () => {
      await expect(
        resolvers[ScopeKind.Attribute]({ data: { id: 'attr-1' }, projectId: 'other' }),
      ).rejects.toBeInstanceOf(NoPermissionError);
    });
  });

  describe('Environment', () => {
    it('derives project from environmentId', async () => {
      expect(await resolvers[ScopeKind.Environment]({ environmentId: 'env-1' })).toMatchObject({
        projectId: 'proj-1',
      });
    });
    it('returns null when environment is unknown / absent', async () => {
      expect(await resolvers[ScopeKind.Environment]({ environmentId: 'nope' })).toBeNull();
      expect(await resolvers[ScopeKind.Environment]({})).toBeNull();
    });
    it('throws on cross-project projectId mismatch', async () => {
      await expect(
        resolvers[ScopeKind.Environment]({ environmentId: 'env-1', projectId: 'other' }),
      ).rejects.toBeInstanceOf(NoPermissionError);
    });
  });

  describe('Content', () => {
    it('derives project from contentId / versionId / stepId', async () => {
      expect(await resolvers[ScopeKind.Content]({ contentId: 'content-1' })).toMatchObject({
        projectId: 'proj-1',
      });
      expect(
        await resolvers[ScopeKind.Content]({ data: { versionId: 'version-1' } }),
      ).toMatchObject({ projectId: 'proj-1' });
      expect(await resolvers[ScopeKind.Content]({ stepId: 'step-1' })).toMatchObject({
        projectId: 'proj-1',
      });
    });
    it('uses explicit environmentId when no entity id is present (create/query)', async () => {
      expect(
        await resolvers[ScopeKind.Content]({ data: { environmentId: 'env-1' } }),
      ).toMatchObject({ projectId: 'proj-1' });
    });
    it('throws when referenced localization is in another project', async () => {
      await expect(
        resolvers[ScopeKind.Content]({ data: { versionId: 'version-1', localizationId: 'loc-2' } }),
      ).rejects.toBeInstanceOf(NoPermissionError);
    });
    it('allows when referenced localization is in the same project', async () => {
      expect(
        await resolvers[ScopeKind.Content]({
          data: { versionId: 'version-1', localizationId: 'loc-1' },
        }),
      ).toMatchObject({ projectId: 'proj-1' });
    });
  });

  describe('Session', () => {
    it('derives project from sessionId → content.projectId, env riding along', async () => {
      expect(await resolvers[ScopeKind.Session]({ sessionId: 'session-1' })).toEqual({
        projectId: 'proj-1',
        environmentIds: ['env-1'],
      });
    });
    it('returns null for unknown / absent session', async () => {
      expect(await resolvers[ScopeKind.Session]({ sessionId: 'nope' })).toBeNull();
      expect(await resolvers[ScopeKind.Session]({})).toBeNull();
    });
  });

  describe('Segment', () => {
    it('derives project from segment id in any of the accepted arg shapes', async () => {
      expect(await resolvers[ScopeKind.Segment]({ data: { id: 'seg-1' } })).toMatchObject({
        projectId: 'proj-1',
      });
      expect(await resolvers[ScopeKind.Segment]({ data: { segmentId: 'seg-1' } })).toMatchObject({
        projectId: 'proj-1',
      });
      expect(
        await resolvers[ScopeKind.Segment]({ data: { userOnSegment: [{ segmentId: 'seg-1' }] } }),
      ).toMatchObject({ projectId: 'proj-1' });
      expect(
        await resolvers[ScopeKind.Segment]({
          data: { companyOnSegment: [{ segmentId: 'seg-1' }] },
        }),
      ).toMatchObject({ projectId: 'proj-1' });
    });
    it('returns null when no segment id is present', async () => {
      expect(await resolvers[ScopeKind.Segment]({ data: {} })).toBeNull();
    });
    it('throws on cross-project projectId mismatch', async () => {
      await expect(
        resolvers[ScopeKind.Segment]({ data: { id: 'seg-1' }, projectId: 'other' }),
      ).rejects.toBeInstanceOf(NoPermissionError);
    });
  });

  describe('Integration', () => {
    it('derives project from integrationId → environment, env riding along', async () => {
      expect(await resolvers[ScopeKind.Integration]({ integrationId: 'int-1' })).toEqual({
        projectId: 'proj-1',
        environmentIds: ['env-1'],
      });
    });
    it('derives project from object-mapping id → integration → environment', async () => {
      expect(await resolvers[ScopeKind.Integration]({ id: 'map-1' })).toEqual({
        projectId: 'proj-1',
        environmentIds: ['env-1'],
      });
    });
    it('returns null when neither integration nor mapping id resolves', async () => {
      expect(await resolvers[ScopeKind.Integration]({})).toBeNull();
      expect(await resolvers[ScopeKind.Integration]({ integrationId: 'nope' })).toBeNull();
    });
  });
});
