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
 * and the `@Public` pre-auth provider query. Effects are asserted in the DB,
 * not just the response.
 */
const CREATE = `
  mutation ($projectId: String!, $input: CreateOidcSsoProviderInput!) {
    createOidcSsoProvider(projectId: $projectId, input: $input) {
      id name issuer clientId defaultRole status allowedDomains
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

const validInput = (overrides: Record<string, unknown> = {}) => ({
  name: 'Okta',
  defaultRole: 'ADMIN',
  issuer: 'https://example.okta.com',
  clientId: 'client-123',
  clientSecret: 'secret-abc',
  allowedDomains: ['acme.com'],
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
        defaultRole: 'ADMIN',
        status: 'active',
        allowedDomains: ['acme.com'],
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

    it('rejects an invalid default role (OWNER)', async () => {
      const res = await graphql(app, {
        token: ownerToken,
        query: CREATE,
        variables: { projectId, input: validInput({ defaultRole: 'OWNER' }) },
      });
      expect(res.body?.errors?.length ?? 0).toBeGreaterThan(0);
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
          defaultRole: 'VIEWER',
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
          defaultRole: 'ADMIN',
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
          defaultRole: 'ADMIN',
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
          defaultRole: 'ADMIN',
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
          defaultRole: 'ADMIN',
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
});
