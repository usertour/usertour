import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { graphql, gqlData } from '../auth';
import { createTestApp } from '../create-test-app';
import {
  buildEnvironment,
  buildIntegration,
  buildIntegrationObjectMapping,
  buildProject,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';

/**
 * Functional e2e for the `integration` GraphQL resolver — follows the themes
 * template: run as an authorized OWNER (auth/who-can-call is covered by
 * permission.e2e-spec) and assert each mutation's effect in the DB, not just the
 * response shape. Integration data is environment-scoped, so every fixture lives
 * under this project's environment.
 *
 * Salesforce ops:
 *  - `getSalesforceAuthUrl` is pure (builds an OAuth authorize URL via jsforce,
 *    no network). SALESFORCE_* config is present in the run environment, so the
 *    happy path is fully covered (real URL string asserted) plus the
 *    invalid-provider error path.
 *  - `getSalesforceObjectFields` makes real Salesforce network calls via jsforce
 *    against a connected integration's OAuth tokens. No connected integration
 *    (and no network) exists in the test, so it throws `Integration or OAuth
 *    configuration not found`; we assert that error and do NOT hit the network.
 *    GAP: object-fields happy path uncovered (would need a live Salesforce OAuth
 *    session / a mocked jsforce Connection).
 */
describe('GraphQL integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let token: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'gql-integration' });
    projectId = project.id;
    const environment = await buildEnvironment(prisma, { projectId });
    environmentId = environment.id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    token = owner.token;
    userIds.push(owner.user.id);
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await teardownProject(prisma, projectId);
      if (userIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }
    await app?.close();
  });

  describe('listIntegrations', () => {
    it('lists integrations for the environment', async () => {
      const created = await buildIntegration(prisma, { environmentId, provider: 'amplitude' });
      const res = await graphql(app, {
        token,
        query: `query ($environmentId: String!) {
          listIntegrations(environmentId: $environmentId) { id provider environmentId enabled }
        }`,
        variables: { environmentId },
      });
      const ids = gqlData(res).listIntegrations.map((i: { id: string }) => i.id);
      expect(ids).toContain(created.id);
    });

    it('returns an empty list for an environment with no integrations', async () => {
      const empty = await buildEnvironment(prisma, { projectId });
      const res = await graphql(app, {
        token,
        query: `query ($environmentId: String!) {
          listIntegrations(environmentId: $environmentId) { id }
        }`,
        variables: { environmentId: empty.id },
      });
      expect(gqlData(res).listIntegrations).toEqual([]);
    });
  });

  describe('getIntegration', () => {
    it('reads an integration by environment + provider', async () => {
      const created = await buildIntegration(prisma, { environmentId, provider: 'heap' });
      const res = await graphql(app, {
        token,
        query: `query ($environmentId: String!, $provider: String!) {
          getIntegration(environmentId: $environmentId, provider: $provider) {
            id provider environmentId enabled
          }
        }`,
        variables: { environmentId, provider: 'heap' },
      });
      expect(gqlData(res).getIntegration).toMatchObject({
        id: created.id,
        provider: 'heap',
        environmentId,
      });
    });

    it('errors for an unknown provider', async () => {
      const res = await graphql(app, {
        token,
        query: `query ($environmentId: String!, $provider: String!) {
          getIntegration(environmentId: $environmentId, provider: $provider) { id }
        }`,
        variables: { environmentId, provider: 'does-not-exist' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('updateIntegration', () => {
    it('upserts key + enabled and persists them', async () => {
      const res = await graphql(app, {
        token,
        query: `mutation ($environmentId: String!, $provider: String!, $input: UpdateIntegrationInput!) {
          updateIntegration(environmentId: $environmentId, provider: $provider, input: $input) {
            id provider key enabled
          }
        }`,
        variables: {
          environmentId,
          provider: 'mixpanel',
          input: { key: 'mp-key', enabled: true },
        },
      });
      const updated = gqlData(res).updateIntegration;
      expect(updated).toMatchObject({ provider: 'mixpanel', key: 'mp-key', enabled: true });

      const row = await prisma.integration.findUnique({
        where: { environmentId_provider: { environmentId, provider: 'mixpanel' } },
      });
      expect(row).toMatchObject({ key: 'mp-key', enabled: true });
    });

    it('updates an existing integration row in place', async () => {
      await buildIntegration(prisma, {
        environmentId,
        provider: 'posthog',
        key: 'old',
        enabled: false,
      });
      const res = await graphql(app, {
        token,
        query: `mutation ($environmentId: String!, $provider: String!, $input: UpdateIntegrationInput!) {
          updateIntegration(environmentId: $environmentId, provider: $provider, input: $input) {
            id key enabled
          }
        }`,
        variables: {
          environmentId,
          provider: 'posthog',
          input: { key: 'new', enabled: true },
        },
      });
      expect(gqlData(res).updateIntegration).toMatchObject({ key: 'new', enabled: true });

      const row = await prisma.integration.findUnique({
        where: { environmentId_provider: { environmentId, provider: 'posthog' } },
      });
      expect(row).toMatchObject({ key: 'new', enabled: true });
    });
  });

  describe('getSalesforceAuthUrl', () => {
    // PURE op: builds an OAuth authorize URL via jsforce (no network). Requires
    // SALESFORCE_* config; this is present in the run environment, so we assert
    // the real URL. As a side effect the service upserts a `salesforce`
    // integration row keyed by the URL `state`; teardownProject cleans it up.
    it('returns an OAuth authorize URL and seeds the integration row', async () => {
      const res = await graphql(app, {
        token,
        query: `query ($environmentId: String!, $provider: String!) {
          getSalesforceAuthUrl(environmentId: $environmentId, provider: $provider)
        }`,
        variables: { environmentId, provider: 'salesforce' },
      });
      const url: string = gqlData(res).getSalesforceAuthUrl;
      expect(typeof url).toBe('string');
      expect(url).toMatch(/^https?:\/\//);
      expect(url).toContain('/services/oauth2/authorize');

      // state encodes the upserted integration's id.
      const state = new URL(url).searchParams.get('state');
      expect(state).toBeTruthy();
      const seeded = await prisma.integration.findUnique({
        where: { environmentId_provider: { environmentId, provider: 'salesforce' } },
      });
      expect(seeded?.id).toBe(state);
    });

    it('errors for an invalid provider', async () => {
      const res = await graphql(app, {
        token,
        query: `query ($environmentId: String!, $provider: String!) {
          getSalesforceAuthUrl(environmentId: $environmentId, provider: $provider)
        }`,
        variables: { environmentId, provider: 'not-salesforce' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('getSalesforceObjectFields', () => {
    // GAP: happy path is uncovered — it makes real Salesforce network calls via
    // jsforce against a connected integration's OAuth tokens, neither of which
    // exist in the test. We assert the no-OAuth error and do NOT hit the network.
    it('errors when the integration has no OAuth configuration', async () => {
      const integration = await buildIntegration(prisma, {
        environmentId,
        provider: 'salesforce-sandbox',
      });
      const res = await graphql(app, {
        token,
        query: `query ($integrationId: String!) {
          getSalesforceObjectFields(integrationId: $integrationId) {
            standardObjects { name }
          }
        }`,
        variables: { integrationId: integration.id },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
      expect(res.body.data?.getSalesforceObjectFields ?? null).toBeNull();
    });
  });

  describe('getIntegrationObjectMappings', () => {
    it('lists mappings for an integration', async () => {
      const integration = await buildIntegration(prisma, {
        environmentId,
        provider: 'sf-map-list',
      });
      const mapping = await buildIntegrationObjectMapping(prisma, {
        integrationId: integration.id,
        sourceObjectType: 'contact',
        destinationObjectType: 'user',
      });
      const res = await graphql(app, {
        token,
        query: `query ($integrationId: String!) {
          getIntegrationObjectMappings(integrationId: $integrationId) {
            id sourceObjectType destinationObjectType integrationId enabled
          }
        }`,
        variables: { integrationId: integration.id },
      });
      const ids = gqlData(res).getIntegrationObjectMappings.map((m: { id: string }) => m.id);
      expect(ids).toContain(mapping.id);
    });

    it('returns an empty list when an integration has no mappings', async () => {
      const integration = await buildIntegration(prisma, {
        environmentId,
        provider: 'sf-map-empty',
      });
      const res = await graphql(app, {
        token,
        query: `query ($integrationId: String!) {
          getIntegrationObjectMappings(integrationId: $integrationId) { id }
        }`,
        variables: { integrationId: integration.id },
      });
      expect(gqlData(res).getIntegrationObjectMappings).toEqual([]);
    });
  });

  describe('getIntegrationObjectMapping', () => {
    it('reads a mapping by id', async () => {
      const integration = await buildIntegration(prisma, { environmentId, provider: 'sf-map-get' });
      const mapping = await buildIntegrationObjectMapping(prisma, {
        integrationId: integration.id,
        sourceObjectType: 'lead',
        destinationObjectType: 'user',
      });
      const res = await graphql(app, {
        token,
        query: `query ($id: String!) {
          getIntegrationObjectMapping(id: $id) {
            id sourceObjectType destinationObjectType integrationId
          }
        }`,
        variables: { id: mapping.id },
      });
      expect(gqlData(res).getIntegrationObjectMapping).toMatchObject({
        id: mapping.id,
        sourceObjectType: 'lead',
        destinationObjectType: 'user',
        integrationId: integration.id,
      });
    });

    it('errors for an unknown mapping id', async () => {
      const res = await graphql(app, {
        token,
        query: 'query ($id: String!) { getIntegrationObjectMapping(id: $id) { id } }',
        variables: { id: 'does-not-exist' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('upsertIntegrationObjectMapping', () => {
    it('creates a mapping and persists it', async () => {
      const integration = await buildIntegration(prisma, {
        environmentId,
        provider: 'sf-upsert-create',
      });
      const res = await graphql(app, {
        token,
        query: `mutation ($integrationId: String!, $input: CreateIntegrationObjectMappingInput!) {
          upsertIntegrationObjectMapping(integrationId: $integrationId, input: $input) {
            id sourceObjectType destinationObjectType enabled settings integrationId
          }
        }`,
        variables: {
          integrationId: integration.id,
          input: {
            sourceObjectType: 'account',
            destinationObjectType: 'company',
            settings: { fieldMap: { Name: 'name' } },
            enabled: true,
          },
        },
      });
      const created = gqlData(res).upsertIntegrationObjectMapping;
      expect(created).toMatchObject({
        sourceObjectType: 'account',
        destinationObjectType: 'company',
        enabled: true,
        integrationId: integration.id,
      });
      expect(created.settings).toEqual({ fieldMap: { Name: 'name' } });

      const row = await prisma.integrationObjectMapping.findUnique({
        where: { id: created.id },
      });
      expect(row).toMatchObject({
        sourceObjectType: 'account',
        destinationObjectType: 'company',
        enabled: true,
      });
    });

    it('updates the existing mapping on conflicting source/destination', async () => {
      const integration = await buildIntegration(prisma, {
        environmentId,
        provider: 'sf-upsert-conflict',
      });
      const existing = await buildIntegrationObjectMapping(prisma, {
        integrationId: integration.id,
        sourceObjectType: 'contact',
        destinationObjectType: 'user',
        enabled: false,
        settings: { v: 1 },
      });
      const res = await graphql(app, {
        token,
        query: `mutation ($integrationId: String!, $input: CreateIntegrationObjectMappingInput!) {
          upsertIntegrationObjectMapping(integrationId: $integrationId, input: $input) {
            id enabled settings
          }
        }`,
        variables: {
          integrationId: integration.id,
          input: {
            sourceObjectType: 'contact',
            destinationObjectType: 'user',
            settings: { v: 2 },
            enabled: true,
          },
        },
      });
      const upserted = gqlData(res).upsertIntegrationObjectMapping;
      expect(upserted.id).toBe(existing.id);
      expect(upserted).toMatchObject({ enabled: true });
      expect(upserted.settings).toEqual({ v: 2 });

      const row = await prisma.integrationObjectMapping.findUnique({ where: { id: existing.id } });
      expect(row).toMatchObject({ enabled: true, settings: { v: 2 } });
    });

    it('errors for an unknown integration', async () => {
      const res = await graphql(app, {
        token,
        query: `mutation ($integrationId: String!, $input: CreateIntegrationObjectMappingInput!) {
          upsertIntegrationObjectMapping(integrationId: $integrationId, input: $input) { id }
        }`,
        variables: {
          integrationId: 'does-not-exist',
          input: { sourceObjectType: 'account', destinationObjectType: 'company' },
        },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('updateIntegrationObjectMapping', () => {
    it('updates settings + enabled and persists them', async () => {
      const integration = await buildIntegration(prisma, { environmentId, provider: 'sf-update' });
      const mapping = await buildIntegrationObjectMapping(prisma, {
        integrationId: integration.id,
        enabled: false,
        settings: { v: 1 },
      });
      const res = await graphql(app, {
        token,
        query: `mutation ($id: String!, $input: UpdateIntegrationObjectMappingInput!) {
          updateIntegrationObjectMapping(id: $id, input: $input) { id enabled settings }
        }`,
        variables: { id: mapping.id, input: { enabled: true, settings: { v: 2 } } },
      });
      const updated = gqlData(res).updateIntegrationObjectMapping;
      expect(updated).toMatchObject({ id: mapping.id, enabled: true });
      expect(updated.settings).toEqual({ v: 2 });

      const row = await prisma.integrationObjectMapping.findUnique({ where: { id: mapping.id } });
      expect(row).toMatchObject({ enabled: true, settings: { v: 2 } });
    });

    it('errors for an unknown mapping id', async () => {
      const res = await graphql(app, {
        token,
        query: `mutation ($id: String!, $input: UpdateIntegrationObjectMappingInput!) {
          updateIntegrationObjectMapping(id: $id, input: $input) { id }
        }`,
        variables: { id: 'does-not-exist', input: { enabled: true } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('deleteIntegrationObjectMapping', () => {
    it('deletes a mapping and removes the row', async () => {
      const integration = await buildIntegration(prisma, { environmentId, provider: 'sf-delete' });
      const mapping = await buildIntegrationObjectMapping(prisma, {
        integrationId: integration.id,
      });
      const res = await graphql(app, {
        token,
        query: 'mutation ($id: String!) { deleteIntegrationObjectMapping(id: $id) }',
        variables: { id: mapping.id },
      });
      expect(gqlData(res).deleteIntegrationObjectMapping).toBe(true);

      const row = await prisma.integrationObjectMapping.findUnique({ where: { id: mapping.id } });
      expect(row).toBeNull();
    });

    it('errors for an unknown mapping id', async () => {
      const res = await graphql(app, {
        token,
        query: 'mutation ($id: String!) { deleteIntegrationObjectMapping(id: $id) }',
        variables: { id: 'does-not-exist' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('disconnectIntegration', () => {
    it('disables the integration, clears its key/config, and drops OAuth', async () => {
      const integration = await buildIntegration(prisma, {
        environmentId,
        provider: 'sf-disconnect',
        enabled: true,
        key: 'secret',
        config: { region: 'EU' },
      });
      await prisma.integrationOAuth.create({
        data: {
          integrationId: integration.id,
          provider: 'salesforce',
          providerAccountId: 'acct-1',
          accessToken: 'at',
          refreshToken: 'rt',
          expiresAt: new Date(Date.now() + 3600 * 1000),
          scope: 'api refresh_token',
          data: { instanceUrl: 'https://example.my.salesforce.com' },
        },
      });

      const res = await graphql(app, {
        token,
        query: `mutation ($environmentId: String!, $provider: String!) {
          disconnectIntegration(environmentId: $environmentId, provider: $provider) {
            id enabled key
          }
        }`,
        variables: { environmentId, provider: 'sf-disconnect' },
      });
      expect(gqlData(res).disconnectIntegration).toMatchObject({
        id: integration.id,
        enabled: false,
        key: '',
      });

      const [row, oauth] = await Promise.all([
        prisma.integration.findUnique({ where: { id: integration.id } }),
        prisma.integrationOAuth.findUnique({ where: { integrationId: integration.id } }),
      ]);
      expect(row).toMatchObject({ enabled: false, key: '' });
      expect(row?.config).toEqual({});
      expect(oauth).toBeNull();
    });

    it('errors when disconnecting a missing integration', async () => {
      const res = await graphql(app, {
        token,
        query: `mutation ($environmentId: String!, $provider: String!) {
          disconnectIntegration(environmentId: $environmentId, provider: $provider) { id }
        }`,
        variables: { environmentId, provider: 'never-existed' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });
});
