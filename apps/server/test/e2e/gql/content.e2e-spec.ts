import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { graphql, gqlData } from '../auth';
import { createTestApp } from '../create-test-app';
import {
  buildContent,
  buildEnvironment,
  buildLocalization,
  buildProject,
  buildStep,
  buildSubscription,
  buildVersion,
  publishVersion,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';

/**
 * Functional e2e for the `content` GraphQL resolver — the core product surface
 * (flows / checklists / launchers / …). Follows the themes template: run as an
 * authorized OWNER, assert each mutation's effect in the DB (not just the
 * response), and cover key read / error cases. Auth (who-can-call) is already
 * covered by permission.e2e-spec; here we run as OWNER.
 *
 * Service semantics worth noting:
 *  - createContent: needs an existing environment; writes a Content + a
 *    sequence-0 Version and points `Content.editedVersionId` at it. A bad
 *    environmentId is wrapped into a generic UnknownError (the whole create is
 *    in one try/catch).
 *  - getContent: nullable — soft-deleted (`deleted=true`) content resolves to
 *    null rather than erroring.
 *  - "editable" gate (addContentStep[s] / updateContentStep / updateContentVersion
 *    / upsertVersionLocalization): the target version must be the content's
 *    `editedVersionId` AND must not be the currently-published version. Publishing
 *    the edited version therefore makes it non-editable.
 *  - createContentVersion / restoreContentVersion: clone the source/edited
 *    version into a NEW version (sequence + 1), carry its VersionOnLocalization
 *    rows along, and re-point editedVersionId.
 *  - publishedContentVersion: upserts a ContentOnEnvironment row + flips
 *    Content.published; unpublishedContentVersion deletes that row + clears it.
 *  - deleteContent: soft-delete (`deleted=true`) and drops ContentOnEnvironment.
 *  - duplicateContent: deep-copies content + edited version + steps into a new
 *    Content row.
 *  - upsertVersionLocalization: creates the VersionOnLocalization row on first
 *    save, updates it in place afterwards; listVersionLocalizations is a pure
 *    read (locales without a row are simply untranslated).
 *  - queryContent / listContentVersions: relay-style cursor pagination.
 */
describe('GraphQL content (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let token: string;
  const userIds: string[] = [];

  // A minimal-but-valid content config: duplicateConfig() touches
  // autoStartRules / hideRules during duplicateContent, so keep them present.
  const sampleConfig = {
    enabledAutoStartRules: false,
    enabledHideRules: false,
    autoStartRules: [],
    hideRules: [],
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'gql-content' });
    projectId = project.id;
    // The e2e app runs in cloud mode, so content creation may be plan-gated. A
    // BUSINESS subscription clears the runway for every createContent below.
    await buildSubscription(prisma, { projectId });
    const environment = await buildEnvironment(prisma, { projectId, isPrimary: true });
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

  // ── helpers ──────────────────────────────────────────────────────

  const createContent = (name: string, type = 'flow') =>
    graphql(app, {
      token,
      query: `mutation ($data: ContentInput!) {
        createContent(data: $data) {
          id name type environmentId projectId editedVersionId published deleted
        }
      }`,
      variables: {
        data: { name, type, environmentId, config: sampleConfig, data: {} },
      },
    });

  /**
   * Create a Content + its edited Version directly via factories. Returns both
   * so editability-gated mutations have a fresh, unpublished edited version.
   */
  const seedContent = async (overrides: Record<string, unknown> = {}) => {
    const content = await buildContent(prisma, {
      projectId,
      environmentId,
      type: 'flow',
      ...overrides,
    });
    const version = await buildVersion(prisma, {
      contentId: content.id,
      sequence: 0,
      config: sampleConfig,
    });
    return { content, version };
  };

  // ── createContent ────────────────────────────────────────────────

  describe('createContent', () => {
    it('creates a content + sequence-0 version and persists them', async () => {
      const content = gqlData(await createContent('Flow A')).createContent;
      expect(content).toMatchObject({
        name: 'Flow A',
        type: 'flow',
        environmentId,
        projectId,
        published: false,
        deleted: false,
      });
      expect(content.editedVersionId).toEqual(expect.any(String));

      const row = await prisma.content.findUnique({ where: { id: content.id } });
      expect(row).toMatchObject({
        name: 'Flow A',
        type: 'flow',
        environmentId,
        projectId,
        deleted: false,
      });

      const version = await prisma.version.findUnique({
        where: { id: content.editedVersionId },
      });
      expect(version).toMatchObject({ contentId: content.id, sequence: 0 });
    });

    it('errors for an unknown environment', async () => {
      const res = await graphql(app, {
        token,
        query: 'mutation ($data: ContentInput!) { createContent(data: $data) { id } }',
        variables: {
          data: { name: 'No Env', type: 'flow', environmentId: 'does-not-exist' },
        },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── getContent ───────────────────────────────────────────────────

  describe('getContent', () => {
    it('reads a content by id', async () => {
      const created = gqlData(await createContent('Readable')).createContent;
      const res = await graphql(app, {
        token,
        query: 'query ($contentId: String!) { getContent(contentId: $contentId) { id name type } }',
        variables: { contentId: created.id },
      });
      expect(gqlData(res).getContent).toMatchObject({
        id: created.id,
        name: 'Readable',
        type: 'flow',
      });
    });

    it('resolves the steps field from the edited version', async () => {
      const { content, version } = await seedContent();
      await buildStep(prisma, { versionId: version.id, sequence: 0, type: 'tooltip' });
      await buildStep(prisma, { versionId: version.id, sequence: 1, type: 'tooltip' });

      const res = await graphql(app, {
        token,
        query:
          'query ($contentId: String!) { getContent(contentId: $contentId) { id steps { id sequence } } }',
        variables: { contentId: content.id },
      });
      const got = gqlData(res).getContent;
      expect(got.steps).toHaveLength(2);
      expect(got.steps.map((s: { sequence: number }) => s.sequence)).toEqual([0, 1]);
    });

    it('returns null for a soft-deleted content', async () => {
      const { content } = await seedContent();
      await prisma.content.update({ where: { id: content.id }, data: { deleted: true } });
      const res = await graphql(app, {
        token,
        query: 'query ($contentId: String!) { getContent(contentId: $contentId) { id } }',
        variables: { contentId: content.id },
      });
      expect(gqlData(res).getContent).toBeNull();
    });
  });

  // ── updateContent ────────────────────────────────────────────────

  describe('updateContent', () => {
    it('updates the name + buildUrl and persists it', async () => {
      const created = gqlData(await createContent('Before')).createContent;
      const res = await graphql(app, {
        token,
        query: `mutation ($data: ContentUpdateInput!) {
          updateContent(data: $data) { id name buildUrl }
        }`,
        variables: {
          data: { contentId: created.id, content: { name: 'After', buildUrl: 'https://x.test' } },
        },
      });
      expect(gqlData(res).updateContent).toMatchObject({
        id: created.id,
        name: 'After',
        buildUrl: 'https://x.test',
      });

      const row = await prisma.content.findUnique({ where: { id: created.id } });
      expect(row).toMatchObject({ name: 'After', buildUrl: 'https://x.test' });
    });

    it('errors updating an unknown content', async () => {
      const res = await graphql(app, {
        token,
        query: 'mutation ($data: ContentUpdateInput!) { updateContent(data: $data) { id } }',
        variables: { data: { contentId: 'does-not-exist', content: { name: 'x' } } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── duplicateContent ─────────────────────────────────────────────

  describe('duplicateContent', () => {
    it('deep-copies a content + its steps into a new row', async () => {
      const { content, version } = await seedContent();
      await buildStep(prisma, { versionId: version.id, sequence: 0, type: 'tooltip', name: 's0' });
      await buildStep(prisma, { versionId: version.id, sequence: 1, type: 'tooltip', name: 's1' });

      const res = await graphql(app, {
        token,
        query: `mutation ($data: ContentDuplicateInput!) {
          duplicateContent(data: $data) { id name type environmentId projectId }
        }`,
        variables: { data: { contentId: content.id, name: 'Copy' } },
      });
      const copy = gqlData(res).duplicateContent;
      expect(copy.id).not.toBe(content.id);
      expect(copy).toMatchObject({ name: 'Copy', type: 'flow', environmentId, projectId });

      // The mutation returns the freshly-created Content before editedVersionId is
      // re-pointed, so read the persisted row to find the copied edited version.
      const copyRow = await prisma.content.findUnique({ where: { id: copy.id } });
      expect(copyRow).not.toBeNull();
      expect(copyRow?.editedVersionId).toEqual(expect.any(String));

      const copiedSteps = await prisma.step.findMany({
        where: { versionId: copyRow!.editedVersionId! },
        orderBy: { sequence: 'asc' },
      });
      expect(copiedSteps).toHaveLength(2);
      // Brand-new step rows (not the source steps).
      const sourceStepIds = await prisma.step
        .findMany({ where: { versionId: version.id }, select: { id: true } })
        .then((rows) => rows.map((r) => r.id));
      for (const s of copiedSteps) {
        expect(sourceStepIds).not.toContain(s.id);
      }
    });

    it('errors duplicating an unknown content', async () => {
      const res = await graphql(app, {
        token,
        query: 'mutation ($data: ContentDuplicateInput!) { duplicateContent(data: $data) { id } }',
        variables: { data: { contentId: 'does-not-exist', name: 'Copy' } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── createContentVersion ─────────────────────────────────────────

  describe('createContentVersion', () => {
    it('clones the edited version into a new version and re-points editedVersionId', async () => {
      const { content, version } = await seedContent();
      await buildStep(prisma, { versionId: version.id, sequence: 0, type: 'tooltip' });
      // createContentVersion only forks when the edited version is published; an
      // unpublished draft is reused in place. Publish so this exercises the fork
      // path it asserts.
      await publishVersion(prisma, {
        environmentId,
        contentId: content.id,
        versionId: version.id,
      });

      const res = await graphql(app, {
        token,
        query: `mutation ($data: ContentVersionInput!) {
          createContentVersion(data: $data) { id sequence contentId }
        }`,
        variables: { data: { versionId: version.id, config: sampleConfig } },
      });
      const newVersion = gqlData(res).createContentVersion;
      expect(newVersion.id).not.toBe(version.id);
      expect(newVersion).toMatchObject({ contentId: content.id, sequence: 1 });

      const contentRow = await prisma.content.findUnique({ where: { id: content.id } });
      expect(contentRow?.editedVersionId).toBe(newVersion.id);

      const clonedSteps = await prisma.step.findMany({ where: { versionId: newVersion.id } });
      expect(clonedSteps).toHaveLength(1);
    });

    it('carries VersionOnLocalization rows to the forked version', async () => {
      const { content, version } = await seedContent();
      await buildStep(prisma, { versionId: version.id, sequence: 0, type: 'tooltip' });
      const loc = await buildLocalization(prisma, { projectId });
      await prisma.versionOnLocalization.create({
        data: {
          versionId: version.id,
          localizationId: loc.id,
          enabled: true,
          localized: { 'step-cvid': [] },
          backup: { 'step-cvid': [] },
        },
      });
      await publishVersion(prisma, {
        environmentId,
        contentId: content.id,
        versionId: version.id,
      });

      const res = await graphql(app, {
        token,
        query: `mutation ($data: ContentVersionInput!) {
          createContentVersion(data: $data) { id }
        }`,
        variables: { data: { versionId: version.id, config: sampleConfig } },
      });
      const newVersion = gqlData(res).createContentVersion;

      const carried = await prisma.versionOnLocalization.findMany({
        where: { versionId: newVersion.id },
      });
      expect(carried).toHaveLength(1);
      expect(carried[0]).toMatchObject({ localizationId: loc.id, enabled: true });
      expect(carried[0].localized).toEqual({ 'step-cvid': [] });

      // The source version keeps its own rows untouched.
      const sourceRows = await prisma.versionOnLocalization.findMany({
        where: { versionId: version.id },
      });
      expect(sourceRows).toHaveLength(1);
    });

    // Editing a published content's targeting must ship the *new* condition ids
    // the server regenerates — the SDK dedupes tracked conditions by id, so
    // reusing a stale id makes a republished targeting change a silent no-op.
    // These two cases lock both branches of createContentVersion.
    const configWithCondition = (conditionId: string, value: string) => ({
      enabledAutoStartRules: true,
      enabledHideRules: false,
      autoStartRules: [
        { type: 'user-attr', id: conditionId, operators: 'and', data: { logic: 'is', value } },
      ],
      hideRules: [],
    });

    it('fork branch: regenerates condition ids and applies the new config', async () => {
      const content = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
      const version = await buildVersion(prisma, {
        contentId: content.id,
        sequence: 0,
        config: configWithCondition('COND_SEED', 'old'),
      });
      // Publish the edited version so the next edit forks a fresh draft.
      await publishVersion(prisma, {
        environmentId,
        contentId: content.id,
        versionId: version.id,
      });

      const res = await graphql(app, {
        token,
        query: `mutation ($data: ContentVersionInput!) {
          createContentVersion(data: $data) { id sequence contentId }
        }`,
        variables: {
          data: { versionId: version.id, config: configWithCondition('COND_SEED', 'new') },
        },
      });
      const newVersion = gqlData(res).createContentVersion;
      expect(newVersion.id).not.toBe(version.id);

      const row = await prisma.version.findUnique({ where: { id: newVersion.id } });
      const rule = (row?.config as any).autoStartRules[0];
      expect(rule.data.value).toBe('new'); // caller's edit applied
      expect(rule.id).not.toBe('COND_SEED'); // condition id regenerated on fork
    });

    it('reuse branch: applies the new config (not dropped) with regenerated ids', async () => {
      // No publish → the edited version is already an unpublished draft, so a
      // concurrent-save-style createContentVersion reuses it instead of forking.
      const content = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
      const version = await buildVersion(prisma, {
        contentId: content.id,
        sequence: 0,
        config: configWithCondition('COND_SEED', 'old'),
      });

      const res = await graphql(app, {
        token,
        query: `mutation ($data: ContentVersionInput!) {
          createContentVersion(data: $data) { id }
        }`,
        variables: {
          data: { versionId: version.id, config: configWithCondition('COND_SEED', 'new') },
        },
      });
      const reused = gqlData(res).createContentVersion;
      expect(reused.id).toBe(version.id); // reused the draft, no new version

      const row = await prisma.version.findUnique({ where: { id: version.id } });
      const rule = (row?.config as any).autoStartRules[0];
      expect(rule.data.value).toBe('new'); // #4: caller's config applied, not dropped
      expect(rule.id).not.toBe('COND_SEED'); // condition id regenerated on reuse
    });

    it('reuse branch: no config leaves the draft config (and its ids) untouched', async () => {
      // A data / theme save calls createContentVersion with NO config. The reuse
      // branch must leave the existing draft's config alone — not regenerate its
      // condition ids (as it would if it mirrored the fork branch's
      // `config ?? editedVersion.config`), or a concurrent targeting edit's fresh
      // ids would be churned back out from under it.
      const content = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
      const version = await buildVersion(prisma, {
        contentId: content.id,
        sequence: 0,
        config: configWithCondition('COND_KEPT', 'kept'),
      });

      const res = await graphql(app, {
        token,
        query:
          'mutation ($data: ContentVersionInput!) { createContentVersion(data: $data) { id } }',
        variables: { data: { versionId: version.id } }, // no config
      });
      expect(gqlData(res).createContentVersion.id).toBe(version.id); // reused, no new version

      const row = await prisma.version.findUnique({ where: { id: version.id } });
      const rule = (row?.config as any).autoStartRules[0];
      expect(rule.id).toBe('COND_KEPT'); // untouched — NOT regenerated
      expect(rule.data.value).toBe('kept');
    });

    it('fork branch: no config keeps the source version config (ids regenerated)', async () => {
      // A data / theme save on a published content forks with NO config; the fork
      // must carry the source version's config (with fresh ids) via the
      // `config ?? editedVersion.config` fallback, not drop it. Every other fork
      // test passes a config, so this is the only lock on the no-config path.
      const content = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
      const version = await buildVersion(prisma, {
        contentId: content.id,
        sequence: 0,
        config: configWithCondition('COND_SRC', 'src'),
      });
      await publishVersion(prisma, {
        environmentId,
        contentId: content.id,
        versionId: version.id,
      });

      const res = await graphql(app, {
        token,
        query:
          'mutation ($data: ContentVersionInput!) { createContentVersion(data: $data) { id } }',
        variables: { data: { versionId: version.id } }, // no config
      });
      const forked = gqlData(res).createContentVersion;
      expect(forked.id).not.toBe(version.id); // forked a new version

      const row = await prisma.version.findUnique({ where: { id: forked.id } });
      const rule = (row?.config as any).autoStartRules[0];
      expect(rule.data.value).toBe('src'); // source config preserved, not dropped
      expect(rule.id).not.toBe('COND_SRC'); // ids regenerated on fork
    });

    it('errors for an unknown source version', async () => {
      const res = await graphql(app, {
        token,
        query:
          'mutation ($data: ContentVersionInput!) { createContentVersion(data: $data) { id } }',
        variables: { data: { versionId: 'does-not-exist' } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── getContentVersion ────────────────────────────────────────────

  describe('getContentVersion', () => {
    it('reads a version (with ordered steps) by id', async () => {
      const { version } = await seedContent();
      await buildStep(prisma, { versionId: version.id, sequence: 1, type: 'tooltip' });
      await buildStep(prisma, { versionId: version.id, sequence: 0, type: 'tooltip' });

      const res = await graphql(app, {
        token,
        query: `query ($versionId: String!) {
          getContentVersion(versionId: $versionId) { id sequence steps { id sequence } }
        }`,
        variables: { versionId: version.id },
      });
      const got = gqlData(res).getContentVersion;
      expect(got.id).toBe(version.id);
      expect(got.steps.map((s: { sequence: number }) => s.sequence)).toEqual([0, 1]);
    });

    it('errors for an unknown version', async () => {
      const res = await graphql(app, {
        token,
        query: 'query ($versionId: String!) { getContentVersion(versionId: $versionId) { id } }',
        variables: { versionId: 'does-not-exist' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── updateContentVersion ─────────────────────────────────────────

  describe('updateContentVersion', () => {
    it('updates the edited version data and persists it', async () => {
      const { version } = await seedContent();
      const res = await graphql(app, {
        token,
        query: `mutation ($data: VersionUpdateInput!) {
          updateContentVersion(data: $data) { id data }
        }`,
        variables: { data: { versionId: version.id, content: { data: { headline: 'hi' } } } },
      });
      expect(gqlData(res).updateContentVersion).toMatchObject({ id: version.id });

      const row = await prisma.version.findUnique({ where: { id: version.id } });
      expect(row?.data).toEqual({ headline: 'hi' });
    });

    it('errors updating a published (non-editable) version', async () => {
      const { content, version } = await seedContent();
      // Publish the edited version → it is no longer editable.
      await publishVersion(prisma, {
        environmentId,
        contentId: content.id,
        versionId: version.id,
      });

      const res = await graphql(app, {
        token,
        query: 'mutation ($data: VersionUpdateInput!) { updateContentVersion(data: $data) { id } }',
        variables: { data: { versionId: version.id, content: { data: { x: 1 } } } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });

    it('errors when expectedUpdatedAt is stale (concurrent save)', async () => {
      const { version } = await seedContent();
      const stale = new Date(version.updatedAt.getTime() - 1000).toISOString();

      const res = await graphql(app, {
        token,
        query: 'mutation ($data: VersionUpdateInput!) { updateContentVersion(data: $data) { id } }',
        variables: {
          data: {
            versionId: version.id,
            content: { data: { x: 1 } },
            expectedUpdatedAt: stale,
          },
        },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);

      // The blind write was refused — the row is untouched.
      const row = await prisma.version.findUnique({ where: { id: version.id } });
      expect(row?.data).not.toEqual({ x: 1 });
    });

    it('saves when expectedUpdatedAt matches the current version', async () => {
      const { version } = await seedContent();

      const res = await graphql(app, {
        token,
        query: 'mutation ($data: VersionUpdateInput!) { updateContentVersion(data: $data) { id } }',
        variables: {
          data: {
            versionId: version.id,
            content: { data: { x: 2 } },
            expectedUpdatedAt: version.updatedAt.toISOString(),
          },
        },
      });
      expect(res.body.errors).toBeUndefined();

      const row = await prisma.version.findUnique({ where: { id: version.id } });
      expect(row?.data).toEqual({ x: 2 });
    });
  });

  // ── restoreContentVersion ────────────────────────────────────────

  describe('restoreContentVersion', () => {
    it('creates a new version from an older one and re-points editedVersionId', async () => {
      const { content, version: v0 } = await seedContent();
      // Promote the edited version a couple of times so v0 is "older".
      const v1 = await prisma.version.create({
        data: { contentId: content.id, sequence: 1, config: sampleConfig },
      });
      await prisma.content.update({
        where: { id: content.id },
        data: { editedVersionId: v1.id },
      });

      const res = await graphql(app, {
        token,
        query: `mutation ($data: VersionIdInput!) {
          restoreContentVersion(data: $data) { id sequence contentId }
        }`,
        variables: { data: { versionId: v0.id } },
      });
      const restored = gqlData(res).restoreContentVersion;
      expect(restored.id).not.toBe(v0.id);
      expect(restored.id).not.toBe(v1.id);
      // sequence = editedVersion(v1).sequence + 1
      expect(restored).toMatchObject({ contentId: content.id, sequence: 2 });

      const contentRow = await prisma.content.findUnique({ where: { id: content.id } });
      expect(contentRow?.editedVersionId).toBe(restored.id);
    });

    it('carries the restored version localizations to the new draft', async () => {
      const { content, version: v0 } = await seedContent();
      const loc = await buildLocalization(prisma, { projectId });
      await prisma.versionOnLocalization.create({
        data: {
          versionId: v0.id,
          localizationId: loc.id,
          enabled: true,
          localized: { 'step-cvid': [] },
          backup: {},
        },
      });
      const v1 = await prisma.version.create({
        data: { contentId: content.id, sequence: 1, config: sampleConfig },
      });
      await prisma.content.update({
        where: { id: content.id },
        data: { editedVersionId: v1.id },
      });

      const res = await graphql(app, {
        token,
        query: `mutation ($data: VersionIdInput!) {
          restoreContentVersion(data: $data) { id }
        }`,
        variables: { data: { versionId: v0.id } },
      });
      const restored = gqlData(res).restoreContentVersion;

      const carried = await prisma.versionOnLocalization.findMany({
        where: { versionId: restored.id },
      });
      expect(carried).toHaveLength(1);
      expect(carried[0]).toMatchObject({ localizationId: loc.id, enabled: true });
    });

    it('errors restoring an unknown version', async () => {
      const res = await graphql(app, {
        token,
        query: 'mutation ($data: VersionIdInput!) { restoreContentVersion(data: $data) { id } }',
        variables: { data: { versionId: 'does-not-exist' } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── publishedContentVersion ──────────────────────────────────────

  describe('publishedContentVersion', () => {
    it('publishes a version and writes a ContentOnEnvironment row', async () => {
      const { content, version } = await seedContent();
      const res = await graphql(app, {
        token,
        query: `mutation ($data: VersionIdInput!) {
          publishedContentVersion(data: $data) { id contentId }
        }`,
        variables: { data: { versionId: version.id, environmentId } },
      });
      expect(gqlData(res).publishedContentVersion).toMatchObject({ id: content.id });

      const contentRow = await prisma.content.findUnique({ where: { id: content.id } });
      expect(contentRow).toMatchObject({ published: true, publishedVersionId: version.id });

      const coe = await prisma.contentOnEnvironment.findUnique({
        where: { environmentId_contentId: { environmentId, contentId: content.id } },
      });
      expect(coe).toMatchObject({
        environmentId,
        contentId: content.id,
        published: true,
        publishedVersionId: version.id,
      });
    });

    it('errors publishing an unknown version', async () => {
      const res = await graphql(app, {
        token,
        query: 'mutation ($data: VersionIdInput!) { publishedContentVersion(data: $data) { id } }',
        variables: { data: { versionId: 'does-not-exist', environmentId } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });

    it("refuses publishing into ANOTHER project's environment (E1019, no cross-tenant COE)", async () => {
      // The caller is authorized against the CONTENT's project, but the target
      // environmentId is a plain arg — without the domain env↔project guard an
      // ADMIN could inject their content into a foreign project's environment,
      // which the SDK runtime would then serve to that project's end users.
      const { content, version } = await seedContent();
      const otherProject = await buildProject(prisma, { name: 'gql-content-foreign' });
      const foreignEnv = await buildEnvironment(prisma, { projectId: otherProject.id });

      const res = await graphql(app, {
        token,
        query: 'mutation ($data: VersionIdInput!) { publishedContentVersion(data: $data) { id } }',
        variables: { data: { versionId: version.id, environmentId: foreignEnv.id } },
      });
      expect(res.body.errors?.[0]?.extensions?.code).toBe('E1019');

      // No ContentOnEnvironment row leaked into the foreign environment, and the
      // content's global published flag was not flipped.
      const coe = await prisma.contentOnEnvironment.findUnique({
        where: { environmentId_contentId: { environmentId: foreignEnv.id, contentId: content.id } },
      });
      expect(coe).toBeNull();
      const contentRow = await prisma.content.findUnique({ where: { id: content.id } });
      expect(contentRow?.published).toBe(false);

      await teardownProject(prisma, otherProject.id);
    });
  });

  // ── unpublishedContentVersion ────────────────────────────────────

  describe('unpublishedContentVersion', () => {
    it('unpublishes a content and removes the ContentOnEnvironment row', async () => {
      const { content, version } = await seedContent();
      // Publish first via the mutation under test's sibling.
      await graphql(app, {
        token,
        query: 'mutation ($data: VersionIdInput!) { publishedContentVersion(data: $data) { id } }',
        variables: { data: { versionId: version.id, environmentId } },
      });

      const res = await graphql(app, {
        token,
        query: `mutation ($data: ContentIdInput!) {
          unpublishedContentVersion(data: $data) { success }
        }`,
        variables: { data: { contentId: content.id, environmentId } },
      });
      expect(gqlData(res).unpublishedContentVersion).toMatchObject({ success: true });

      const contentRow = await prisma.content.findUnique({ where: { id: content.id } });
      expect(contentRow).toMatchObject({ published: false, publishedVersionId: null });

      const coe = await prisma.contentOnEnvironment.findUnique({
        where: { environmentId_contentId: { environmentId, contentId: content.id } },
      });
      expect(coe).toBeNull();
    });

    it('errors unpublishing an unknown content', async () => {
      const res = await graphql(app, {
        token,
        query:
          'mutation ($data: ContentIdInput!) { unpublishedContentVersion(data: $data) { success } }',
        variables: { data: { contentId: 'does-not-exist', environmentId } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });

    it("refuses unpublishing against ANOTHER project's environment (E1019)", async () => {
      const { content } = await seedContent();
      const otherProject = await buildProject(prisma, { name: 'gql-content-foreign-unpub' });
      const foreignEnv = await buildEnvironment(prisma, { projectId: otherProject.id });

      const res = await graphql(app, {
        token,
        query:
          'mutation ($data: ContentIdInput!) { unpublishedContentVersion(data: $data) { success } }',
        variables: { data: { contentId: content.id, environmentId: foreignEnv.id } },
      });
      expect(res.body.errors?.[0]?.extensions?.code).toBe('E1019');

      await teardownProject(prisma, otherProject.id);
    });
  });

  // ── listContentVersions ──────────────────────────────────────────

  describe('listContentVersions', () => {
    it('lists versions for a content (newest sequence first)', async () => {
      const { content, version: v0 } = await seedContent();
      const v1 = await prisma.version.create({
        data: { contentId: content.id, sequence: 1, config: sampleConfig },
      });

      const res = await graphql(app, {
        token,
        query: `query ($contentId: String!, $first: Int) {
          listContentVersions(contentId: $contentId, first: $first) {
            totalCount
            edges { cursor node { id sequence } }
          }
        }`,
        variables: { contentId: content.id, first: 10 },
      });
      const conn = gqlData(res).listContentVersions;
      expect(conn.totalCount).toBe(2);
      const ids = conn.edges.map((e: { node: { id: string } }) => e.node.id);
      expect(ids).toEqual([v1.id, v0.id]);
    });

    it('returns an empty connection for a content with no versions', async () => {
      const content = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
      const res = await graphql(app, {
        token,
        query: `query ($contentId: String!, $first: Int) {
          listContentVersions(contentId: $contentId, first: $first) { totalCount edges { cursor } }
        }`,
        variables: { contentId: content.id, first: 10 },
      });
      const conn = gqlData(res).listContentVersions;
      expect(conn.totalCount).toBe(0);
      expect(conn.edges).toEqual([]);
    });
  });

  // ── listVersionLocalizations ─────────────────────────────────────

  describe('listVersionLocalizations', () => {
    it('returns only existing rows without materializing locales that lack one', async () => {
      const { version } = await seedContent();
      const translated = await buildLocalization(prisma, { projectId });
      const untranslated = await buildLocalization(prisma, { projectId });
      await prisma.versionOnLocalization.create({
        data: { versionId: version.id, localizationId: translated.id, localized: {}, backup: {} },
      });

      const res = await graphql(app, {
        token,
        query: `query ($versionId: String!) {
          listVersionLocalizations(versionId: $versionId) {
            id versionId localizationId enabled
          }
        }`,
        variables: { versionId: version.id },
      });
      const rows = gqlData(res).listVersionLocalizations;
      expect(rows.map((row: { localizationId: string }) => row.localizationId)).toEqual([
        translated.id,
      ]);

      // The read must not create rows as a side effect.
      const materialized = await prisma.versionOnLocalization.findFirst({
        where: { versionId: version.id, localizationId: untranslated.id },
      });
      expect(materialized).toBeNull();
    });
  });

  // ── upsertVersionLocalization ────────────────────────────────────

  describe('upsertVersionLocalization', () => {
    const upsertMutation = `mutation ($data: VersionUpdateLocalizationInput!) {
      upsertVersionLocalization(data: $data) {
        id versionId localizationId enabled localized backup
      }
    }`;

    it('creates the row on first save and updates it in place afterwards', async () => {
      const { version } = await seedContent();
      const loc = await buildLocalization(prisma, { projectId });

      const createRes = await graphql(app, {
        token,
        query: upsertMutation,
        variables: {
          data: {
            versionId: version.id,
            localizationId: loc.id,
            enabled: false,
            localized: { greeting: 'hola' },
            backup: { greeting: 'hello' },
          },
        },
      });
      const created = gqlData(createRes).upsertVersionLocalization;
      expect(created).toMatchObject({
        versionId: version.id,
        localizationId: loc.id,
        enabled: false,
      });
      expect(created.localized).toEqual({ greeting: 'hola' });

      const updateRes = await graphql(app, {
        token,
        query: upsertMutation,
        variables: {
          data: {
            versionId: version.id,
            localizationId: loc.id,
            enabled: true,
            localized: { greeting: 'bonjour' },
            backup: { greeting: 'hello' },
          },
        },
      });
      const updated = gqlData(updateRes).upsertVersionLocalization;
      // Same row updated in place, not a second one created.
      expect(updated.id).toBe(created.id);
      expect(updated.enabled).toBe(true);
      expect(updated.localized).toEqual({ greeting: 'bonjour' });

      const rows = await prisma.versionOnLocalization.findMany({
        where: { versionId: version.id, localizationId: loc.id },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].localized).toEqual({ greeting: 'bonjour' });
      expect(rows[0].backup).toEqual({ greeting: 'hello' });
    });
  });

  // ── deleteContent ────────────────────────────────────────────────

  describe('deleteContent', () => {
    it('refuses to delete published content (E1028), then soft-deletes once unpublished', async () => {
      const { content, version } = await seedContent();
      await publishVersion(prisma, {
        environmentId,
        contentId: content.id,
        versionId: version.id,
      });

      // Still live in an environment → delete must refuse, not silently take
      // the content down (the builder unpublish-first contract, E1028).
      const refused = await graphql(app, {
        token,
        query: 'mutation ($data: ContentIdInput!) { deleteContent(data: $data) { success } }',
        variables: { data: { contentId: content.id } },
      });
      expect(refused.body.errors?.[0]?.extensions?.code).toBe('E1028');

      // Unpublish (COE row kept with published=false — the delete guard only blocks
      // on published=true). deleteContent must still DROP the leftover COE rows, or
      // findPublishedVersionId re-resolves a versionId for the deleted content when
      // the env cache repopulates and SDK users are served a deleted experience.
      await prisma.contentOnEnvironment.updateMany({
        where: { contentId: content.id },
        data: { published: false }, // COE row kept; publishedVersionId is non-null
      });

      const res = await graphql(app, {
        token,
        query: 'mutation ($data: ContentIdInput!) { deleteContent(data: $data) { success } }',
        variables: { data: { contentId: content.id } },
      });
      expect(gqlData(res).deleteContent).toMatchObject({ success: true });

      const row = await prisma.content.findUnique({ where: { id: content.id } });
      expect(row?.deleted).toBe(true);
      // The invariant this test exists to lock: soft-delete drops per-env rows.
      const coes = await prisma.contentOnEnvironment.findMany({
        where: { contentId: content.id },
      });
      expect(coes).toEqual([]);
    });

    it('errors deleting an unknown content', async () => {
      const res = await graphql(app, {
        token,
        query: 'mutation ($data: ContentIdInput!) { deleteContent(data: $data) { success } }',
        variables: { data: { contentId: 'does-not-exist' } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── queryContent ─────────────────────────────────────────────────

  describe('queryContent', () => {
    it('returns content for the environment (created item appears)', async () => {
      const created = gqlData(await createContent('Queryable')).createContent;
      const res = await graphql(app, {
        token,
        query: `query ($query: ContentQuery, $first: Int) {
          queryContent(query: $query, first: $first) {
            totalCount
            edges { cursor node { id name type } }
          }
        }`,
        variables: { query: { environmentId }, first: 50 },
      });
      const conn = gqlData(res).queryContent;
      const ids = conn.edges.map((e: { node: { id: string } }) => e.node.id);
      expect(ids).toContain(created.id);
    });

    it('filters by name (contains)', async () => {
      const unique = `Needle-${Date.now()}`;
      const created = gqlData(await createContent(unique)).createContent;
      const res = await graphql(app, {
        token,
        query: `query ($query: ContentQuery, $first: Int) {
          queryContent(query: $query, first: $first) { edges { node { id name } } }
        }`,
        variables: { query: { environmentId, name: unique }, first: 50 },
      });
      const nodes = gqlData(res).queryContent.edges.map(
        (e: { node: { id: string; name: string } }) => e.node,
      );
      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toMatchObject({ id: created.id, name: unique });
    });

    it('orders by createdAt desc', async () => {
      const res = await graphql(app, {
        token,
        query: `query ($query: ContentQuery, $orderBy: ContentOrder, $first: Int) {
          queryContent(query: $query, orderBy: $orderBy, first: $first) {
            edges { node { id createdAt } }
          }
        }`,
        variables: {
          query: { environmentId },
          orderBy: { field: 'createdAt', direction: 'desc' },
          first: 5,
        },
      });
      // This describe block created several contents, so there are >= 2 here.
      // Assert the ordering is actually descending (catches an ignored orderBy —
      // natural insertion order would be ascending).
      const times = gqlData(res).queryContent.edges.map((e: { node: { createdAt: string } }) =>
        new Date(e.node.createdAt).getTime(),
      );
      expect(times.length).toBeGreaterThanOrEqual(2);
      for (let i = 0; i < times.length - 1; i++) {
        expect(times[i]).toBeGreaterThanOrEqual(times[i + 1]);
      }
    });
  });
});
