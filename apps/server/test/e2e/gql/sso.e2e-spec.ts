import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { graphql, gqlData, gqlErrorCode, isPermissionDenied } from '../auth';
import { buildProject, buildSubscription } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';

// The SSO entitlement gate resolves via subscription only in SaaS mode, and
// `config.ts` reads `IS_SELF_HOSTED_MODE` at module-import time. Force SaaS mode
// before AppModule (and thus config.ts) loads — hence the lazy require below.
// None of the static imports above transitively pull in config.ts, and Jest
// isolates each spec file in its own worker, so this does not leak.
const prevSelfHosted = process.env.IS_SELF_HOSTED_MODE;
process.env.IS_SELF_HOSTED_MODE = 'false';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createTestApp } = require('../create-test-app') as typeof import('../create-test-app');

/**
 * Functional e2e for the project-level SSO GraphQL surface. Exercises the real
 * wiring that unit tests with mocks would skip: PermissionGuard +
 * `ScopeKind.Sso` resolution, the `SsoManage`/`SsoRead` capabilities, the
 * plan-entitlement gate (BUSINESS via subscription, e2e runs in SaaS mode),
 * the `@Public` pre-auth provider query, and the project-level settings
 * (force-SSO enforcement + provisioning, with the anti-lockout guard). Effects
 * are asserted in the DB, not just the response.
 */
const CREATE = `
  mutation ($projectId: String!, $input: CreateOidcSsoProviderInput!) {
    createOidcSsoProvider(projectId: $projectId, input: $input) {
      id name issuer clientId status
    }
  }
`;
const LIST = `
  query ($projectId: String!) {
    listProjectSsoProviders(projectId: $projectId) { id name issuer }
  }
`;
const PUBLIC = `
  query ($projectId: String!) {
    getProjectSsoProviders(projectId: $projectId) { id name type }
  }
`;
const UPDATE = `
  mutation ($id: String!, $input: UpdateSsoProviderInput!) {
    updateSsoProvider(id: $id, input: $input) { id name }
  }
`;
const DELETE = 'mutation ($id: String!) { deleteSsoProvider(id: $id) }';
const GET_SETTINGS = `
  query ($projectId: String!) {
    getProjectSsoSettings(projectId: $projectId) {
      projectId requireSso defaultRole allowedDomains
    }
  }
`;
const UPDATE_SETTINGS = `
  mutation ($projectId: String!, $input: UpdateProjectSsoSettingsInput!) {
    updateProjectSsoSettings(projectId: $projectId, input: $input) {
      requireSso defaultRole allowedDomains
    }
  }
`;

const validInput = (overrides: Record<string, unknown> = {}) => ({
  name: 'Okta',
  issuer: 'https://example.okta.com',
  clientId: 'client-123',
  clientSecret: 'secret-abc',
  ...overrides,
});

describe('GraphQL sso (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  // Entitled project (BUSINESS subscription) + its owner / admin / viewer.
  let projectId: string;
  let ownerToken: string;
  let adminToken: string;
  let viewerToken: string;
  // A second, un-entitled project (no subscription) + an owner who belongs
  // only to it — used for the entitlement gate and the cross-project scope.
  let otherProjectId: string;
  let otherOwnerToken: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'gql-sso' });
    projectId = project.id;
    await buildSubscription(prisma, { projectId }); // BUSINESS → ssoOidc: true

    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    const admin = await buildAuthorizedUser(prisma, app, { projectId, role: 'ADMIN' });
    const viewer = await buildAuthorizedUser(prisma, app, { projectId, role: 'VIEWER' });
    ownerToken = owner.token;
    adminToken = admin.token;
    viewerToken = viewer.token;

    const other = await buildProject(prisma, { name: 'gql-sso-free' }); // no subscription
    otherProjectId = other.id;
    const otherOwner = await buildAuthorizedUser(prisma, app, {
      projectId: otherProjectId,
      role: 'OWNER',
    });
    otherOwnerToken = otherOwner.token;

    userIds.push(owner.user.id, admin.user.id, viewer.user.id, otherOwner.user.id);
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await teardownProject(prisma, projectId);
      await teardownProject(prisma, otherProjectId);
      if (userIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }
    await app?.close();
    process.env.IS_SELF_HOSTED_MODE = prevSelfHosted ?? '';
  });

  describe('createOidcSsoProvider', () => {
    it('creates a provider and persists it (owner, entitled)', async () => {
      const res = await graphql(app, {
        token: ownerToken,
        query: CREATE,
        variables: { projectId, input: validInput({ name: 'Okta Prod' }) },
      });
      const created = gqlData(res).createOidcSsoProvider;
      expect(created).toMatchObject({
        name: 'Okta Prod',
        issuer: 'https://example.okta.com',
        clientId: 'client-123',
        status: 'active',
      });

      const row = await prisma.projectSSOIdentityProvider.findUnique({
        where: { id: created.id },
      });
      expect(row?.projectId).toBe(projectId);
      // Secret is stored but never returned over the API.
      expect(row?.clientSecret).toBe('secret-abc');
      expect(created.clientSecret).toBeUndefined();

      await prisma.projectSSOIdentityProvider.delete({ where: { id: created.id } });
    });

    it('rejects when the project is not entitled (E0043)', async () => {
      const res = await graphql(app, {
        token: otherOwnerToken,
        query: CREATE,
        variables: { projectId: otherProjectId, input: validInput() },
      });
      expect(gqlErrorCode(res)).toBe('E0043');
      const count = await prisma.projectSSOIdentityProvider.count({
        where: { projectId: otherProjectId },
      });
      expect(count).toBe(0);
    });

    it('denies a non-owner (admin) — SsoManage is owner-only', async () => {
      const res = await graphql(app, {
        token: adminToken,
        query: CREATE,
        variables: { projectId, input: validInput() },
      });
      expect(isPermissionDenied(res)).toBe(true);
    });
  });

  describe('listProjectSsoProviders', () => {
    it('lists providers for the owner and denies a viewer (SsoRead owner-only)', async () => {
      const provider = await prisma.projectSSOIdentityProvider.create({
        data: {
          projectId,
          type: 'OIDC',
          name: 'List Me',
          issuer: 'https://idp.test',
          clientId: 'c',
          clientSecret: 's',
        },
      });

      const ownerRes = await graphql(app, {
        token: ownerToken,
        query: LIST,
        variables: { projectId },
      });
      const names = gqlData(ownerRes).listProjectSsoProviders.map((p: any) => p.name);
      expect(names).toContain('List Me');

      const viewerRes = await graphql(app, {
        token: viewerToken,
        query: LIST,
        variables: { projectId },
      });
      expect(isPermissionDenied(viewerRes)).toBe(true);

      await prisma.projectSSOIdentityProvider.delete({ where: { id: provider.id } });
    });
  });

  describe('getProjectSsoProviders (public)', () => {
    it('returns active providers without auth, and [] for an un-entitled project', async () => {
      const active = await prisma.projectSSOIdentityProvider.create({
        data: {
          projectId,
          type: 'OIDC',
          name: 'Public IdP',
          status: 'active',
          issuer: 'https://idp.test',
          clientId: 'c',
          clientSecret: 's',
        },
      });

      const res = await graphql(app, { query: PUBLIC, variables: { projectId } }); // no token
      const providers = gqlData(res).getProjectSsoProviders;
      expect(providers.map((p: any) => p.name)).toContain('Public IdP');
      // Never leaks config/secrets — only id/name/type are selectable.
      expect(providers[0]).toEqual({
        id: expect.any(String),
        name: expect.any(String),
        type: expect.any(String),
      });

      const freeRes = await graphql(app, {
        query: PUBLIC,
        variables: { projectId: otherProjectId },
      });
      expect(gqlData(freeRes).getProjectSsoProviders).toEqual([]);

      await prisma.projectSSOIdentityProvider.delete({ where: { id: active.id } });
    });
  });

  describe('updateSsoProvider / deleteSsoProvider (ScopeKind.Sso)', () => {
    it('updates by id and keeps the secret when omitted', async () => {
      const provider = await prisma.projectSSOIdentityProvider.create({
        data: {
          projectId,
          type: 'OIDC',
          name: 'Before',
          issuer: 'https://idp.test',
          clientId: 'c',
          clientSecret: 'keep-me',
        },
      });

      const res = await graphql(app, {
        token: ownerToken,
        query: UPDATE,
        variables: { id: provider.id, input: { name: 'After' } },
      });
      expect(gqlData(res).updateSsoProvider.name).toBe('After');

      const row = await prisma.projectSSOIdentityProvider.findUnique({
        where: { id: provider.id },
      });
      expect(row?.name).toBe('After');
      expect(row?.clientSecret).toBe('keep-me'); // unchanged

      await prisma.projectSSOIdentityProvider.delete({ where: { id: provider.id } });
    });

    it("denies an owner of another project (scope resolves the provider's project)", async () => {
      const provider = await prisma.projectSSOIdentityProvider.create({
        data: {
          projectId, // belongs to the entitled project
          type: 'OIDC',
          name: 'Guarded',
          issuer: 'https://idp.test',
          clientId: 'c',
          clientSecret: 's',
        },
      });

      // otherOwner is OWNER of otherProject, not a member of `projectId`.
      const res = await graphql(app, {
        token: otherOwnerToken,
        query: UPDATE,
        variables: { id: provider.id, input: { name: 'Hijacked' } },
      });
      expect(isPermissionDenied(res)).toBe(true);
      const row = await prisma.projectSSOIdentityProvider.findUnique({
        where: { id: provider.id },
      });
      expect(row?.name).toBe('Guarded'); // untouched

      await prisma.projectSSOIdentityProvider.delete({ where: { id: provider.id } });
    });

    it('deletes by id (owner)', async () => {
      const provider = await prisma.projectSSOIdentityProvider.create({
        data: {
          projectId,
          type: 'OIDC',
          name: 'Delete Me',
          issuer: 'https://idp.test',
          clientId: 'c',
          clientSecret: 's',
        },
      });

      const res = await graphql(app, {
        token: ownerToken,
        query: DELETE,
        variables: { id: provider.id },
      });
      expect(gqlData(res).deleteSsoProvider).toBe(true);
      const row = await prisma.projectSSOIdentityProvider.findUnique({
        where: { id: provider.id },
      });
      expect(row).toBeNull();
    });
  });

  describe('project SSO settings (enforcement + provisioning)', () => {
    it('returns defaults for the owner and denies a viewer (SsoRead)', async () => {
      const res = await graphql(app, {
        token: ownerToken,
        query: GET_SETTINGS,
        variables: { projectId },
      });
      expect(gqlData(res).getProjectSsoSettings).toMatchObject({
        requireSso: false,
        defaultRole: 'ADMIN',
        allowedDomains: [],
      });

      const viewerRes = await graphql(app, {
        token: viewerToken,
        query: GET_SETTINGS,
        variables: { projectId },
      });
      expect(isPermissionDenied(viewerRes)).toBe(true);
    });

    it('updates provisioning (owner) and denies an admin (SsoManage)', async () => {
      const res = await graphql(app, {
        token: ownerToken,
        query: UPDATE_SETTINGS,
        variables: { projectId, input: { defaultRole: 'VIEWER', allowedDomains: ['acme.com'] } },
      });
      expect(gqlData(res).updateProjectSsoSettings).toMatchObject({
        defaultRole: 'VIEWER',
        allowedDomains: ['acme.com'],
      });

      const adminRes = await graphql(app, {
        token: adminToken,
        query: UPDATE_SETTINGS,
        variables: { projectId, input: { defaultRole: 'ADMIN' } },
      });
      expect(isPermissionDenied(adminRes)).toBe(true);

      // Reset provisioning back to defaults for the following tests.
      await graphql(app, {
        token: ownerToken,
        query: UPDATE_SETTINGS,
        variables: { projectId, input: { defaultRole: 'ADMIN', allowedDomains: [] } },
      });
    });

    it('rejects an invalid default role (OWNER)', async () => {
      const res = await graphql(app, {
        token: ownerToken,
        query: UPDATE_SETTINGS,
        variables: { projectId, input: { defaultRole: 'OWNER' } },
      });
      expect(res.body?.errors?.length ?? 0).toBeGreaterThan(0);
    });

    it('refuses to require SSO without an active provider (E0052)', async () => {
      // Make sure the project has no active provider to fall back on.
      await prisma.projectSSOIdentityProvider.deleteMany({ where: { projectId } });

      const res = await graphql(app, {
        token: ownerToken,
        query: UPDATE_SETTINGS,
        variables: { projectId, input: { requireSso: true } },
      });
      expect(gqlErrorCode(res)).toBe('E0052');

      const settings = await prisma.projectSsoSettings.findUnique({ where: { projectId } });
      expect(settings?.requireSso ?? false).toBe(false);
    });

    it('requires SSO with an active provider, then guards the last one (E0052)', async () => {
      const provider = await prisma.projectSSOIdentityProvider.create({
        data: {
          projectId,
          type: 'OIDC',
          name: 'Active',
          status: 'active',
          issuer: 'https://idp.test',
          clientId: 'c',
          clientSecret: 's',
        },
      });

      const enable = await graphql(app, {
        token: ownerToken,
        query: UPDATE_SETTINGS,
        variables: { projectId, input: { requireSso: true } },
      });
      expect(gqlData(enable).updateProjectSsoSettings.requireSso).toBe(true);

      // Deleting the last active provider would strand members — rejected.
      const del = await graphql(app, {
        token: ownerToken,
        query: DELETE,
        variables: { id: provider.id },
      });
      expect(gqlErrorCode(del)).toBe('E0052');

      // Deactivating it is blocked for the same reason.
      const deactivate = await graphql(app, {
        token: ownerToken,
        query: UPDATE,
        variables: { id: provider.id, input: { status: 'inactive' } },
      });
      expect(gqlErrorCode(deactivate)).toBe('E0052');

      // Turn enforcement off — now cleanup is allowed again.
      await graphql(app, {
        token: ownerToken,
        query: UPDATE_SETTINGS,
        variables: { projectId, input: { requireSso: false } },
      });
      await prisma.projectSSOIdentityProvider.delete({ where: { id: provider.id } });
    });

    it('lets an un-entitled project turn requireSso off without entitlement (recovery)', async () => {
      // Simulate a project that enabled enforcement and then lost entitlement:
      // seed requireSso directly on the un-entitled project (enabling via the
      // API would require entitlement, but disabling must not).
      await prisma.projectSsoSettings.upsert({
        where: { projectId: otherProjectId },
        create: { projectId: otherProjectId, requireSso: true },
        update: { requireSso: true },
      });

      const res = await graphql(app, {
        token: otherOwnerToken,
        query: UPDATE_SETTINGS,
        variables: { projectId: otherProjectId, input: { requireSso: false } },
      });
      expect(gqlData(res).updateProjectSsoSettings.requireSso).toBe(false);
    });
  });
});
