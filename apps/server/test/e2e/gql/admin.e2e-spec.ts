import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { graphql, gqlData, signToken } from '../auth';
import { buildUser, buildProject, buildMembership } from '../factories';
import { teardownProject } from './_support';

// The admin resolver is guarded by SystemAdminGuard, which requires self-hosted
// mode. The repo's root `.env` ships `IS_SELF_HOSTED_MODE=false` and `.env.test`
// doesn't override it. The `config` object (src/common/configs/config.ts) reads
// `process.env.IS_SELF_HOSTED_MODE` at MODULE-IMPORT time, so we must set it
// before AppModule is ever imported. We therefore (1) force it ON here at module
// scope (this runs before the lazy `require` of create-test-app in beforeAll)
// and (2) import create-test-app lazily so config.ts is evaluated only after the
// flag is set. None of the static imports above transitively pull in config.ts.
// Jest runs each spec file in its own worker process, so this does not leak.
const prevSelfHosted = process.env.IS_SELF_HOSTED_MODE;
process.env.IS_SELF_HOSTED_MODE = 'true';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createTestApp } = require('../create-test-app') as typeof import('../create-test-app');

/**
 * Functional e2e for the `admin` GraphQL resolver — system-admin (self-host)
 * operations. Every op is guarded by `SystemAdminGuard`, which (a) requires
 * self-hosted mode and (b) requires the acting user's `isSystemAdmin` flag.
 * So we run as a user built with `{ isSystemAdmin: true }`. Each mutation
 * asserts the effect in the DB; each query asserts response shape.
 *
 * CRITICAL — global state safety. `InstanceSetting` is a single shared row
 * (key = "instance"). Several auth/two-factor suites read it (esp.
 * `allowUserRegistration` and `require2FA` — the latter drives the global
 * `TwoFactorEnrollmentGuard`). To avoid polluting them we:
 *   - snapshot the singleton in `beforeAll`,
 *   - restore the snapshot in `afterAll`,
 *   - and additionally restore any mutated field at the end of each test that
 *     touches it.
 * `require2FA` is NEVER successfully turned on here (our admin isn't 2FA
 * enrolled, so the "turn on" path always throws before persisting — and we
 * only assert that error), which keeps the enrollment guard quiet for every
 * other suite.
 *
 * Cleanup: `adminCreateUser` / `adminCreateProject` create global rows. We
 * track every created user id and project id and tear them down in `afterAll`
 * (`teardownProject` for projects, `prisma.user.deleteMany` for users).
 */
describe('GraphQL admin (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string; // system-admin acting user
  const userIds: string[] = [];
  const projectIds: string[] = [];

  const INSTANCE_KEY = 'instance';

  // Snapshot of the shared InstanceSetting row, restored verbatim in afterAll.
  let settingSnapshot: {
    name: string | null;
    contactEmail: string | null;
    allowUserRegistration: boolean;
    require2FA: boolean;
    allowProjectLevelSubscriptionManagement: boolean | null;
    license: string | null;
  };

  const readSetting = () => prisma.instanceSetting.findUnique({ where: { key: INSTANCE_KEY } });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    // The acting system admin. Not 2FA-enrolled on purpose (see header).
    const admin = await buildUser(prisma, {
      name: 'Sys Admin',
      isSystemAdmin: true,
    });
    userIds.push(admin.id);
    token = signToken(app, admin.id);

    // Snapshot the shared singleton so afterAll can restore it. The app's
    // onModuleInit already upserts it in self-hosted mode, so it exists.
    const existing = await prisma.instanceSetting.upsert({
      where: { key: INSTANCE_KEY },
      create: { key: INSTANCE_KEY },
      update: {},
    });
    settingSnapshot = {
      name: existing.name,
      contactEmail: existing.contactEmail,
      allowUserRegistration: existing.allowUserRegistration,
      require2FA: existing.require2FA,
      allowProjectLevelSubscriptionManagement: existing.allowProjectLevelSubscriptionManagement,
      license: existing.license,
    };
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      // Restore the shared singleton to its exact original values so other
      // e2e suites (auth, two-factor) are not polluted.
      await prisma.instanceSetting.update({
        where: { key: INSTANCE_KEY },
        data: settingSnapshot,
      });

      for (const projectId of projectIds) {
        await teardownProject(prisma, projectId);
      }
      if (userIds.length) {
        // `adminCreateUser` also creates an Account row (email provider) that
        // FK-references the user, so delete those before the users. Any other
        // per-project membership rows were removed by teardownProject above.
        await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }
    await app?.close();

    // Restore the flag. Parallel e2e workers isolate process.env per process, so
    // this is mostly tidiness; `?? ''` avoids `delete` (and avoids the
    // `= undefined` footgun that coerces to the string "undefined").
    process.env.IS_SELF_HOSTED_MODE = prevSelfHosted ?? '';
  });

  // ==========================================================================
  // Settings (read)
  // ==========================================================================

  describe('adminSettings', () => {
    it('returns instance-level settings summary', async () => {
      const res = await graphql(app, {
        token,
        query: `query {
          adminSettings {
            instanceId
            projectCount
            projectsUsingInstanceLicense
            isOverProjectLimit
            licenseInfo { isValid }
          }
        }`,
      });
      const info = gqlData(res).adminSettings;
      expect(typeof info.instanceId).toBe('string');
      expect(typeof info.projectCount).toBe('number');
      expect(typeof info.projectsUsingInstanceLicense).toBe('number');
      expect(typeof info.isOverProjectLimit).toBe('boolean');
      // No instance license configured in the test DB → licenseInfo is null.
      expect(info.licenseInfo).toBeNull();
    });

    it('denies a non-system-admin user', async () => {
      const plain = await buildUser(prisma, { isSystemAdmin: false });
      userIds.push(plain.id);
      const res = await graphql(app, {
        token: signToken(app, plain.id),
        query: 'query { adminSettings { instanceId } }',
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('adminInstanceSettings', () => {
    it('returns the full instance setting row', async () => {
      const res = await graphql(app, {
        token,
        query: `query {
          adminInstanceSettings {
            id
            instanceId
            name
            contactEmail
            allowUserRegistration
            require2FA
            allowProjectLevelSubscriptionManagement
            license
          }
        }`,
      });
      const s = gqlData(res).adminInstanceSettings;
      expect(typeof s.id).toBe('string');
      expect(typeof s.instanceId).toBe('string');
      expect(typeof s.allowUserRegistration).toBe('boolean');
      expect(typeof s.require2FA).toBe('boolean');
    });
  });

  // ==========================================================================
  // Settings (mutations)
  // ==========================================================================

  describe('updateInstanceLicense', () => {
    // Happy-path GAP: persisting a license requires a validly-signed,
    // instance-scoped license JWT whose instanceId matches this instance and
    // which is not expired — minted by an external key we don't have in tests
    // (same situation as projects.updateProjectLicense). We cover the ERROR
    // path (invalid token rejected, singleton untouched) and document the
    // happy path as a gap.
    it('rejects an invalid license and leaves the singleton license unchanged', async () => {
      const before = await readSetting();

      const res = await graphql(app, {
        token,
        query:
          'mutation ($license: String!) { updateInstanceLicense(license: $license) { id license } }',
        variables: { license: 'not-a-valid-instance-license-token' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);

      const after = await readSetting();
      expect(after?.license).toBe(before?.license ?? null);
    });
  });

  describe('updateInstanceGeneralSettings', () => {
    it('updates name + contactEmail and persists it', async () => {
      const before = await readSetting();
      try {
        const res = await graphql(app, {
          token,
          query: `mutation ($name: String, $contactEmail: String) {
            updateInstanceGeneralSettings(name: $name, contactEmail: $contactEmail) {
              id name contactEmail
            }
          }`,
          variables: { name: 'Acme Instance', contactEmail: 'Ops@Acme.COM' },
        });
        const s = gqlData(res).updateInstanceGeneralSettings;
        // contactEmail is normalized to lowercase by the service.
        expect(s).toMatchObject({ name: 'Acme Instance', contactEmail: 'ops@acme.com' });

        const row = await readSetting();
        expect(row).toMatchObject({ name: 'Acme Instance', contactEmail: 'ops@acme.com' });
      } finally {
        // Restore the two fields this test mutated.
        await prisma.instanceSetting.update({
          where: { key: INSTANCE_KEY },
          data: { name: before?.name ?? null, contactEmail: before?.contactEmail ?? null },
        });
      }
    });

    it('rejects an invalid contact email', async () => {
      const res = await graphql(app, {
        token,
        query: `mutation ($contactEmail: String) {
          updateInstanceGeneralSettings(contactEmail: $contactEmail) { id }
        }`,
        variables: { contactEmail: 'not-an-email' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('updateInstanceAuthenticationSettings', () => {
    it('toggles allowUserRegistration and persists it (restored after)', async () => {
      const before = await readSetting();
      const target = !(before?.allowUserRegistration ?? true);
      try {
        const res = await graphql(app, {
          token,
          query: `mutation ($allowUserRegistration: Boolean!) {
            updateInstanceAuthenticationSettings(allowUserRegistration: $allowUserRegistration) {
              id allowUserRegistration
            }
          }`,
          variables: { allowUserRegistration: target },
        });
        expect(gqlData(res).updateInstanceAuthenticationSettings.allowUserRegistration).toBe(
          target,
        );

        const row = await readSetting();
        expect(row?.allowUserRegistration).toBe(target);
      } finally {
        // Restore — auth suite reads this field.
        await prisma.instanceSetting.update({
          where: { key: INSTANCE_KEY },
          data: { allowUserRegistration: before?.allowUserRegistration ?? true },
        });
      }
    });
  });

  describe('updateInstanceRequire2FA', () => {
    // The "turn ON" path requires the acting admin to be 2FA-enrolled AND the
    // instance to hold a 2FA-feature license. Our admin is intentionally not
    // enrolled, so turning on throws SystemAdminMustEnable2FAFirstError BEFORE
    // any write — which is exactly what keeps require2FA off for every other
    // suite. We assert the error and confirm the singleton stays false.
    it('rejects turning on require2FA when the admin is not 2FA-enrolled', async () => {
      const before = await readSetting();
      expect(before?.require2FA).toBe(false);

      const res = await graphql(app, {
        token,
        query:
          'mutation ($value: Boolean!) { updateInstanceRequire2FA(value: $value) { id require2FA } }',
        variables: { value: true },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);

      const after = await readSetting();
      expect(after?.require2FA).toBe(false);
    });

    it('allows turning off require2FA (idempotent no-op when already off)', async () => {
      // "Turn off" is always allowed (no gating). Starting from off, this is a
      // safe no-op that leaves the singleton off.
      const res = await graphql(app, {
        token,
        query:
          'mutation ($value: Boolean!) { updateInstanceRequire2FA(value: $value) { id require2FA } }',
        variables: { value: false },
      });
      expect(gqlData(res).updateInstanceRequire2FA.require2FA).toBe(false);

      const after = await readSetting();
      expect(after?.require2FA).toBe(false);
    });
  });

  // ==========================================================================
  // Users
  // ==========================================================================

  describe('adminUsers', () => {
    it('lists users with pagination and includes a known user', async () => {
      const target = await buildUser(prisma, { name: 'Listed User' });
      userIds.push(target.id);

      const res = await graphql(app, {
        token,
        query: `query ($page: Int, $pageSize: Int) {
          adminUsers(page: $page, pageSize: $pageSize) {
            total page pageSize
            items { id name email isSystemAdmin disabled projectCount }
          }
        }`,
        variables: { page: 1, pageSize: 200 },
      });
      const list = gqlData(res).adminUsers;
      expect(list.page).toBe(1);
      expect(list.pageSize).toBe(200);
      expect(typeof list.total).toBe('number');
      const ids = list.items.map((u: { id: string }) => u.id);
      expect(ids).toContain(target.id);
    });

    it('filters by query string (email/name contains)', async () => {
      const tag = `needle-${Date.now()}`;
      const target = await buildUser(prisma, { name: `User ${tag}` });
      userIds.push(target.id);

      const res = await graphql(app, {
        token,
        query: `query ($query: String) {
          adminUsers(query: $query) { total items { id name } }
        }`,
        variables: { query: tag },
      });
      const list = gqlData(res).adminUsers;
      const ids = list.items.map((u: { id: string }) => u.id);
      expect(ids).toContain(target.id);
      // The narrow query should not pull in our admin or other unrelated users.
      expect(list.items.every((u: { name: string }) => u.name?.includes(tag))).toBe(true);
    });

    it('filters by role = systemAdmin', async () => {
      const res = await graphql(app, {
        token,
        query: `query ($role: String) {
          adminUsers(role: $role, pageSize: 200) { items { id isSystemAdmin } }
        }`,
        variables: { role: 'systemAdmin' },
      });
      const items = gqlData(res).adminUsers.items;
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((u: { isSystemAdmin: boolean }) => u.isSystemAdmin === true)).toBe(true);
    });
  });

  describe('adminCreateUser', () => {
    it('creates a user (+ email account) and persists it', async () => {
      const email = `created-${Date.now()}@test.local`;
      const res = await graphql(app, {
        token,
        query: `mutation ($name: String!, $email: String!, $password: String!) {
          adminCreateUser(name: $name, email: $email, password: $password) {
            id email name isSystemAdmin disabled
          }
        }`,
        variables: { name: 'Created Person', email, password: 'StrongPass1!' },
      });
      const user = gqlData(res).adminCreateUser;
      expect(user).toMatchObject({
        email,
        name: 'Created Person',
        isSystemAdmin: false,
        disabled: false,
      });
      userIds.push(user.id);

      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row).toMatchObject({ email, name: 'Created Person' });
      // Password is hashed, not stored plaintext.
      expect(row?.password).toBeTruthy();
      expect(row?.password).not.toBe('StrongPass1!');

      const account = await prisma.account.findFirst({ where: { userId: user.id } });
      expect(account).toMatchObject({ type: 'email', provider: 'email', providerAccountId: email });
    });

    it('rejects a duplicate email', async () => {
      const existing = await buildUser(prisma, { email: `dup-${Date.now()}@test.local` });
      userIds.push(existing.id);

      const res = await graphql(app, {
        token,
        query: `mutation ($name: String!, $email: String!, $password: String!) {
          adminCreateUser(name: $name, email: $email, password: $password) { id }
        }`,
        variables: { name: 'Dup', email: existing.email!, password: 'StrongPass1!' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('updateUserSystemAdmin', () => {
    it('grants and revokes system-admin and persists it', async () => {
      const target = await buildUser(prisma, { isSystemAdmin: false });
      userIds.push(target.id);

      const grant = await graphql(app, {
        token,
        query: `mutation ($userId: String!, $isSystemAdmin: Boolean!) {
          updateUserSystemAdmin(userId: $userId, isSystemAdmin: $isSystemAdmin) { id isSystemAdmin }
        }`,
        variables: { userId: target.id, isSystemAdmin: true },
      });
      expect(gqlData(grant).updateUserSystemAdmin).toMatchObject({
        id: target.id,
        isSystemAdmin: true,
      });
      expect((await prisma.user.findUnique({ where: { id: target.id } }))?.isSystemAdmin).toBe(
        true,
      );

      // Revoke — safe because our acting admin remains an active system admin,
      // so this is not "the last system admin".
      const revoke = await graphql(app, {
        token,
        query: `mutation ($userId: String!, $isSystemAdmin: Boolean!) {
          updateUserSystemAdmin(userId: $userId, isSystemAdmin: $isSystemAdmin) { id isSystemAdmin }
        }`,
        variables: { userId: target.id, isSystemAdmin: false },
      });
      expect(gqlData(revoke).updateUserSystemAdmin.isSystemAdmin).toBe(false);
      expect((await prisma.user.findUnique({ where: { id: target.id } }))?.isSystemAdmin).toBe(
        false,
      );
    });

    it('errors for an unknown user', async () => {
      const res = await graphql(app, {
        token,
        query: `mutation ($userId: String!, $isSystemAdmin: Boolean!) {
          updateUserSystemAdmin(userId: $userId, isSystemAdmin: $isSystemAdmin) { id }
        }`,
        variables: { userId: 'does-not-exist', isSystemAdmin: true },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('updateUserDisabled', () => {
    it('disables and re-enables a user and persists it', async () => {
      const target = await buildUser(prisma, { disabled: false });
      userIds.push(target.id);

      const disable = await graphql(app, {
        token,
        query: `mutation ($userId: String!, $disabled: Boolean!) {
          updateUserDisabled(userId: $userId, disabled: $disabled) { id disabled }
        }`,
        variables: { userId: target.id, disabled: true },
      });
      expect(gqlData(disable).updateUserDisabled).toMatchObject({ id: target.id, disabled: true });
      expect((await prisma.user.findUnique({ where: { id: target.id } }))?.disabled).toBe(true);

      const enable = await graphql(app, {
        token,
        query: `mutation ($userId: String!, $disabled: Boolean!) {
          updateUserDisabled(userId: $userId, disabled: $disabled) { id disabled }
        }`,
        variables: { userId: target.id, disabled: false },
      });
      expect(gqlData(enable).updateUserDisabled.disabled).toBe(false);
      expect((await prisma.user.findUnique({ where: { id: target.id } }))?.disabled).toBe(false);
    });

    it('errors for an unknown user', async () => {
      // The "cannot disable the last active system admin" guard can't be
      // exercised in a shared DB without risking locking the instance out for
      // other suites (it counts ALL active system admins globally), so we
      // assert the adjacent error path: an unknown userId is rejected.
      const res = await graphql(app, {
        token,
        query: `mutation ($userId: String!, $disabled: Boolean!) {
          updateUserDisabled(userId: $userId, disabled: $disabled) { id }
        }`,
        variables: { userId: 'does-not-exist', disabled: true },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Projects
  // ==========================================================================

  describe('adminProjects', () => {
    it('lists projects with pagination and surfaces owner + counts', async () => {
      const owner = await buildUser(prisma, { name: 'Proj Owner' });
      userIds.push(owner.id);
      const project = await buildProject(prisma, { name: `admin-proj-${Date.now()}` });
      projectIds.push(project.id);
      await buildMembership(prisma, {
        userId: owner.id,
        projectId: project.id,
        role: 'OWNER' as never,
      });

      const res = await graphql(app, {
        token,
        query: `query ($pageSize: Int) {
          adminProjects(pageSize: $pageSize) {
            total page pageSize
            items {
              id name ownerName ownerEmail memberCount usesInstanceLicense licenseSource
            }
          }
        }`,
        variables: { pageSize: 200 },
      });
      const list = gqlData(res).adminProjects;
      expect(typeof list.total).toBe('number');
      const match = list.items.find((p: { id: string }) => p.id === project.id);
      expect(match).toMatchObject({
        name: project.name,
        ownerName: 'Proj Owner',
        ownerEmail: owner.email,
        memberCount: 1,
        usesInstanceLicense: false,
        // No instance/project license configured → no license source.
        licenseSource: 'none',
      });
    });

    it('filters by query string (name contains)', async () => {
      const tag = `pneedle-${Date.now()}`;
      const project = await buildProject(prisma, { name: `Proj ${tag}` });
      projectIds.push(project.id);

      const res = await graphql(app, {
        token,
        query: `query ($query: String) {
          adminProjects(query: $query) { items { id name } }
        }`,
        variables: { query: tag },
      });
      const ids = gqlData(res).adminProjects.items.map((p: { id: string }) => p.id);
      expect(ids).toContain(project.id);
    });
  });

  describe('adminCreateProject', () => {
    it('creates a fully-initialized project owned by the given user', async () => {
      const owner = await buildUser(prisma, { name: 'New Owner' });
      userIds.push(owner.id);

      const res = await graphql(app, {
        token,
        query: `mutation ($name: String!, $ownerUserId: String!) {
          adminCreateProject(name: $name, ownerUserId: $ownerUserId) {
            id name environments { id name isPrimary }
          }
        }`,
        variables: { name: 'Admin-Made Project', ownerUserId: owner.id },
      });
      const project = gqlData(res).adminCreateProject;
      expect(project).toMatchObject({ name: 'Admin-Made Project' });
      projectIds.push(project.id);

      // Owner membership is created, active (owner had no other project).
      const membership = await prisma.userOnProject.findFirst({
        where: { userId: owner.id, projectId: project.id },
      });
      expect(membership).toMatchObject({ role: 'OWNER', actived: true });

      // A primary Production environment is seeded.
      const envRow = await prisma.environment.findFirst({
        where: { projectId: project.id, isPrimary: true },
      });
      expect(envRow?.name).toBe('Production');

      // Default themes + segments are seeded by initialization.
      expect(await prisma.theme.count({ where: { projectId: project.id } })).toBeGreaterThan(0);
      expect(await prisma.segment.count({ where: { projectId: project.id } })).toBeGreaterThan(0);
    });

    it('errors when the owner user does not exist', async () => {
      const res = await graphql(app, {
        token,
        query: `mutation ($name: String!, $ownerUserId: String!) {
          adminCreateProject(name: $name, ownerUserId: $ownerUserId) { id }
        }`,
        variables: { name: 'Orphan', ownerUserId: 'does-not-exist' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('updateProjectUsesInstanceLicense', () => {
    it('returns true and persists false (disable path needs no instance license)', async () => {
      const project = await buildProject(prisma, {
        name: `uses-lic-${Date.now()}`,
        usesInstanceLicense: true,
      });
      projectIds.push(project.id);

      const res = await graphql(app, {
        token,
        query: `mutation ($projectId: String!, $enabled: Boolean!) {
          updateProjectUsesInstanceLicense(projectId: $projectId, enabled: $enabled)
        }`,
        variables: { projectId: project.id, enabled: false },
      });
      expect(gqlData(res).updateProjectUsesInstanceLicense).toBe(true);

      const row = await prisma.project.findUnique({ where: { id: project.id } });
      expect(row?.usesInstanceLicense).toBe(false);
    });

    it('errors enabling when there is no valid instance license', async () => {
      const project = await buildProject(prisma, { name: `enable-lic-${Date.now()}` });
      projectIds.push(project.id);

      const res = await graphql(app, {
        token,
        query: `mutation ($projectId: String!, $enabled: Boolean!) {
          updateProjectUsesInstanceLicense(projectId: $projectId, enabled: $enabled)
        }`,
        variables: { projectId: project.id, enabled: true },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);

      // Unchanged.
      const row = await prisma.project.findUnique({ where: { id: project.id } });
      expect(row?.usesInstanceLicense).toBe(false);
    });

    it('errors for an unknown project', async () => {
      const res = await graphql(app, {
        token,
        query: `mutation ($projectId: String!, $enabled: Boolean!) {
          updateProjectUsesInstanceLicense(projectId: $projectId, enabled: $enabled)
        }`,
        variables: { projectId: 'does-not-exist', enabled: false },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Project Members
  // ==========================================================================

  /** A project with an OWNER member, tracked for teardown. */
  const projectWithOwner = async () => {
    const owner = await buildUser(prisma, { name: 'Member-Owner' });
    userIds.push(owner.id);
    const project = await buildProject(prisma, { name: `members-${Date.now()}-${owner.id}` });
    projectIds.push(project.id);
    await buildMembership(prisma, {
      userId: owner.id,
      projectId: project.id,
      role: 'OWNER' as never,
    });
    return { owner, project };
  };

  describe('adminProjectMembers', () => {
    it('lists members with role + isOwner flags', async () => {
      const { owner, project } = await projectWithOwner();
      const viewer = await buildUser(prisma, { name: 'A Viewer' });
      userIds.push(viewer.id);
      await buildMembership(prisma, {
        userId: viewer.id,
        projectId: project.id,
        role: 'VIEWER' as never,
      });

      const res = await graphql(app, {
        token,
        query: `query ($projectId: String!) {
          adminProjectMembers(projectId: $projectId) {
            id userId name email role isOwner
          }
        }`,
        variables: { projectId: project.id },
      });
      const members = gqlData(res).adminProjectMembers;
      const ownerRow = members.find((m: { userId: string }) => m.userId === owner.id);
      const viewerRow = members.find((m: { userId: string }) => m.userId === viewer.id);
      expect(ownerRow).toMatchObject({ role: 'OWNER', isOwner: true, email: owner.email });
      expect(viewerRow).toMatchObject({ role: 'VIEWER', isOwner: false, email: viewer.email });
    });

    it('errors for an unknown project', async () => {
      const res = await graphql(app, {
        token,
        query: 'query ($projectId: String!) { adminProjectMembers(projectId: $projectId) { id } }',
        variables: { projectId: 'does-not-exist' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('adminAddProjectMember', () => {
    it('adds a member with a role and persists the membership', async () => {
      const { project } = await projectWithOwner();
      const newMember = await buildUser(prisma, { name: 'To Add' });
      userIds.push(newMember.id);

      const res = await graphql(app, {
        token,
        query: `mutation ($projectId: String!, $userId: String!, $role: String!) {
          adminAddProjectMember(projectId: $projectId, userId: $userId, role: $role)
        }`,
        variables: { projectId: project.id, userId: newMember.id, role: 'ADMIN' },
      });
      expect(gqlData(res).adminAddProjectMember).toBe(true);

      const row = await prisma.userOnProject.findFirst({
        where: { userId: newMember.id, projectId: project.id },
      });
      expect(row).toMatchObject({ role: 'ADMIN' });
    });

    it('rejects an invalid role (OWNER cannot be added directly)', async () => {
      const { project } = await projectWithOwner();
      const newMember = await buildUser(prisma, { name: 'Bad Role' });
      userIds.push(newMember.id);

      const res = await graphql(app, {
        token,
        query: `mutation ($projectId: String!, $userId: String!, $role: String!) {
          adminAddProjectMember(projectId: $projectId, userId: $userId, role: $role)
        }`,
        variables: { projectId: project.id, userId: newMember.id, role: 'OWNER' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });

    it('rejects adding a user who is already a member', async () => {
      const { owner, project } = await projectWithOwner();
      const res = await graphql(app, {
        token,
        query: `mutation ($projectId: String!, $userId: String!, $role: String!) {
          adminAddProjectMember(projectId: $projectId, userId: $userId, role: $role)
        }`,
        variables: { projectId: project.id, userId: owner.id, role: 'VIEWER' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('adminChangeProjectMemberRole', () => {
    it('changes a member role and persists it', async () => {
      const { project } = await projectWithOwner();
      const member = await buildUser(prisma, { name: 'Role Change' });
      userIds.push(member.id);
      await buildMembership(prisma, {
        userId: member.id,
        projectId: project.id,
        role: 'VIEWER' as never,
      });

      const res = await graphql(app, {
        token,
        query: `mutation ($projectId: String!, $userId: String!, $role: String!) {
          adminChangeProjectMemberRole(projectId: $projectId, userId: $userId, role: $role)
        }`,
        variables: { projectId: project.id, userId: member.id, role: 'ADMIN' },
      });
      expect(gqlData(res).adminChangeProjectMemberRole).toBe(true);

      const row = await prisma.userOnProject.findFirst({
        where: { userId: member.id, projectId: project.id },
      });
      expect(row?.role).toBe('ADMIN');
    });

    it('errors for a non-member', async () => {
      const { project } = await projectWithOwner();
      const outsider = await buildUser(prisma);
      userIds.push(outsider.id);

      const res = await graphql(app, {
        token,
        query: `mutation ($projectId: String!, $userId: String!, $role: String!) {
          adminChangeProjectMemberRole(projectId: $projectId, userId: $userId, role: $role)
        }`,
        variables: { projectId: project.id, userId: outsider.id, role: 'ADMIN' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('adminTransferProjectOwnership', () => {
    it('makes the target the OWNER and demotes the previous owner to ADMIN', async () => {
      const { owner, project } = await projectWithOwner();
      const heir = await buildUser(prisma, { name: 'Heir' });
      userIds.push(heir.id);
      await buildMembership(prisma, {
        userId: heir.id,
        projectId: project.id,
        role: 'ADMIN' as never,
      });

      const res = await graphql(app, {
        token,
        query: `mutation ($projectId: String!, $userId: String!) {
          adminTransferProjectOwnership(projectId: $projectId, userId: $userId)
        }`,
        variables: { projectId: project.id, userId: heir.id },
      });
      expect(gqlData(res).adminTransferProjectOwnership).toBe(true);

      const [heirRow, oldOwnerRow] = await Promise.all([
        prisma.userOnProject.findFirst({ where: { userId: heir.id, projectId: project.id } }),
        prisma.userOnProject.findFirst({ where: { userId: owner.id, projectId: project.id } }),
      ]);
      expect(heirRow?.role).toBe('OWNER');
      // Previous OWNER is demoted to ADMIN (single-owner invariant).
      expect(oldOwnerRow?.role).toBe('ADMIN');
    });
  });

  describe('adminRemoveProjectMember', () => {
    it('removes a non-owner member and deletes the membership row', async () => {
      const { project } = await projectWithOwner();
      const member = await buildUser(prisma, { name: 'To Remove' });
      userIds.push(member.id);
      await buildMembership(prisma, {
        userId: member.id,
        projectId: project.id,
        role: 'VIEWER' as never,
      });

      const res = await graphql(app, {
        token,
        query: `mutation ($projectId: String!, $userId: String!) {
          adminRemoveProjectMember(projectId: $projectId, userId: $userId)
        }`,
        variables: { projectId: project.id, userId: member.id },
      });
      expect(gqlData(res).adminRemoveProjectMember).toBe(true);

      const row = await prisma.userOnProject.findFirst({
        where: { userId: member.id, projectId: project.id },
      });
      expect(row).toBeNull();
    });

    it('refuses to remove the project owner', async () => {
      const { owner, project } = await projectWithOwner();
      const res = await graphql(app, {
        token,
        query: `mutation ($projectId: String!, $userId: String!) {
          adminRemoveProjectMember(projectId: $projectId, userId: $userId)
        }`,
        variables: { projectId: project.id, userId: owner.id },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);

      // Owner membership still present.
      const row = await prisma.userOnProject.findFirst({
        where: { userId: owner.id, projectId: project.id },
      });
      expect(row?.role).toBe('OWNER');
    });
  });
});
