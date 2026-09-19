import { INestApplication } from '@nestjs/common';
import { Capability, ContentDataType } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import {
  buildBizUser,
  buildContent,
  buildEnvironment,
  buildLocalization,
  buildProject,
  buildTheme,
  buildVersion,
  publishVersion,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { UtilitiesService } from '@/utilities/utilities.service';
import { ContentDataService } from '@/web-socket/core/content-data.service';
import { createTestApp } from '../create-test-app';

/**
 * Contract test for v2 localizations — two resources with two scope families:
 * the project's locales (localization:*, soft-deletable and restorable) and
 * each content version's translation as flat units (content:*). Source text is authored through the real
 * version write so the units come from genuine editor trees, and every write
 * is verified by an independent read (and, where the contract is about storage,
 * against the VersionOnLocalization row itself).
 */
type Ver = { contentId: string; id: string };
type Unit = {
  path: string;
  source: string;
  translation: string;
  optional: boolean;
  outdated: boolean;
};

describe('API v2 localizations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectId: string;
  let environmentId: string;
  let themeId: string;
  let frenchId: string;
  let readToken: string;
  let writeToken: string;
  let localeReadToken: string;
  let localeWriteToken: string;

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  async function mint(scopes: Capability[]): Promise<string> {
    const res = await graphql(app, {
      query: CREATE,
      variables: { input: { name: 'k', scopes, projectIds: [projectId] } },
      token: ownerToken,
    });
    return gqlData(res).createApiToken.token;
  }

  function api(method: 'get' | 'patch' | 'put' | 'post' | 'delete', path: string, token?: string) {
    const req = request(app.getHttpServer())[method](path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  const versionPath = (v: Ver) =>
    `/v2/projects/${projectId}/content/${v.contentId}/versions/${v.id}`;
  const readTranslation = (v: Ver, code: string, token = readToken) =>
    api('get', `${versionPath(v)}/localizations/${code}`, token);
  const writeTranslation = (v: Ver, code: string, body: object, token = writeToken) =>
    api('put', `${versionPath(v)}/localizations/${code}`, token).send(body);
  const writeSource = (v: Ver, body: object) => api('patch', versionPath(v), writeToken).send(body);

  // Other suites in this file add locales to the project; status checks look at French.
  const frenchStatus = (summaries: { code: string }[]) =>
    summaries.find((summary) => summary.code === 'fr');

  const unitBySource = (units: Unit[], source: string): Unit => {
    const unit = units.find((item) => item.source === source);
    if (!unit) {
      throw new Error(`No unit with source "${source}" in ${JSON.stringify(units)}`);
    }
    return unit;
  };

  async function newVersion(type: string): Promise<Ver> {
    const content = await buildContent(prisma, { projectId, environmentId, type });
    const id = (await buildVersion(prisma, { contentId: content.id, sequence: 0, themeId })).id;
    return { contentId: content.id, id };
  }

  /** A flow draft with one modal step: a text block and a button. */
  async function newFlow(text = 'Welcome aboard'): Promise<Ver> {
    const flow = await newVersion('flow');
    const res = await writeSource(flow, {
      steps: [
        {
          name: 'Intro',
          type: 'modal',
          content: [
            { type: 'text', markdown: text },
            { type: 'button', text: 'Continue', actions: [{ type: 'dismiss' }] },
          ],
        },
      ],
    });
    expect(res.status).toBe(200);
    return flow;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'api-v2-localizations' })).id;
    environmentId = (await buildEnvironment(prisma, { projectId })).id;
    themeId = (await buildTheme(prisma, { projectId })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;

    await buildLocalization(prisma, {
      projectId,
      code: 'en',
      locale: 'en-US',
      name: 'English',
      isDefault: true,
    });
    frenchId = (
      await buildLocalization(prisma, { projectId, code: 'fr', locale: 'fr-FR', name: 'French' })
    ).id;

    readToken = await mint([Capability.ContentRead]);
    writeToken = await mint([Capability.ContentRead, Capability.ContentUpdate]);
    localeReadToken = await mint([Capability.LocalizationRead]);
    localeWriteToken = await mint([
      Capability.LocalizationRead,
      Capability.LocalizationCreate,
      Capability.LocalizationUpdate,
      Capability.LocalizationDelete,
    ]);
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.apiToken.deleteMany({ where: { userId: ownerUserId } });
      await prisma.userOnProject.deleteMany({ where: { projectId } });
      await teardownProject(prisma, projectId);
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
    }
    await app?.close();
  });

  describe('project locales', () => {
    const localesPath = () => `/v2/projects/${projectId}/localizations`;
    const createLocale = (body: object, token = localeWriteToken) =>
      api('post', localesPath(), token).send(body);
    const codesOf = (res: { body: { results: { code: string }[] } }) =>
      res.body.results.map((item) => item.code);

    it('lists every live locale with localization:read, flagging the default', async () => {
      const res = await api('get', localesPath(), localeReadToken);
      expect(res.status).toBe(200);
      expect(res.body.next).toBeNull();
      expect(
        res.body.results
          .filter((item: { code: string }) => ['en', 'fr'].includes(item.code))
          .map((item: { code: string; isDefault: boolean; object: string; deleted: boolean }) => ({
            code: item.code,
            isDefault: item.isDefault,
            object: item.object,
            deleted: item.deleted,
          })),
      ).toEqual([
        { code: 'en', isDefault: true, object: 'localization', deleted: false },
        { code: 'fr', isDefault: false, object: 'localization', deleted: false },
      ]);
    });

    it('is its own scope family: content scopes do not list or manage locales', async () => {
      expect((await api('get', localesPath())).status).toBe(401);
      expect((await api('get', localesPath(), readToken)).status).toBe(403);
      expect(
        (await createLocale({ code: 'xx', name: 'Nope', locale: 'xx-XX' }, writeToken)).status,
      ).toBe(403);
      // ...and a read-only locale token cannot write.
      expect(
        (await createLocale({ code: 'xx', name: 'Nope', locale: 'xx-XX' }, localeReadToken)).status,
      ).toBe(403);
    });

    it('a content-only token still finds its target codes through the version expand', async () => {
      const flow = await newFlow();
      const res = await api('get', `${versionPath(flow)}?expand=localizations`, readToken);
      expect(res.status).toBe(200);
      expect(res.body.localizations.map((item: { code: string }) => item.code)).toContain('fr');
    });

    it('creates, renames and re-codes a locale; a taken code is a 409', async () => {
      const created = await createLocale({ code: 'de', name: 'German', locale: 'de-DE' });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({
        object: 'localization',
        code: 'de',
        name: 'German',
        locale: 'de-DE',
        isDefault: false,
        deleted: false,
        restored: false,
      });

      const renamed = await api(
        'patch',
        `${localesPath()}/${created.body.id}`,
        localeWriteToken,
      ).send({ name: 'Deutsch', code: 'de-at' });
      expect(renamed.status).toBe(200);
      expect(renamed.body).toMatchObject({ id: created.body.id, name: 'Deutsch', code: 'de-at' });

      const clash = await api(
        'patch',
        `${localesPath()}/${created.body.id}`,
        localeWriteToken,
      ).send({ code: 'fr' });
      expect(clash.status).toBe(409);
      expect(clash.body.error.code).toBe('E1023');
      const duplicate = await createLocale({ code: 'fr', name: 'French again', locale: 'fr-FR' });
      expect(duplicate.status).toBe(409);

      // isDefault is not settable here; an empty patch is rejected.
      const patchPath = `${localesPath()}/${created.body.id}`;
      expect(
        (await api('patch', patchPath, localeWriteToken).send({ isDefault: true })).status,
      ).toBe(400);
      expect((await api('patch', patchPath, localeWriteToken).send({})).status).toBe(400);
    });

    it('refuses to delete the default locale (E1041) and 404s foreign / unknown ids', async () => {
      const english = await prisma.localization.findFirstOrThrow({
        where: { projectId, isDefault: true },
      });
      const res = await api('delete', `${localesPath()}/${english.id}`, localeWriteToken);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('E1041');

      const foreign = await buildLocalization(prisma, { code: 'pt' });
      const notMine = await api('delete', `${localesPath()}/${foreign.id}`, localeWriteToken);
      expect(notMine.status).toBe(404);
      expect(notMine.body.error.code).toBe('E1040');
      await prisma.localization.delete({ where: { id: foreign.id } });
    });

    it('soft-deletes and restores: translations survive, by restore and by re-create', async () => {
      const italian = (await createLocale({ code: 'it', name: 'Italian', locale: 'it-IT' })).body;
      const flow = await newFlow();
      const units: Unit[] = (await readTranslation(flow, 'it')).body.units;
      const textPath = unitBySource(units, 'Welcome aboard').path;
      await writeTranslation(flow, 'it', {
        translations: { [textPath]: 'Benvenuti a bordo' },
        enabled: true,
      });

      const removed = await api('delete', `${localesPath()}/${italian.id}`, localeWriteToken);
      expect(removed.status).toBe(204);
      expect(codesOf(await api('get', localesPath(), localeReadToken))).not.toContain('it');
      expect(codesOf(await api('get', `${localesPath()}?deleted=true`, localeReadToken))).toEqual([
        'it',
      ]);
      // Not a translation target, and gone from the version's status, while deleted…
      expect((await readTranslation(flow, 'it')).status).toBe(404);
      const summary = await api('get', `${versionPath(flow)}?expand=localizations`, readToken);
      expect(summary.body.localizations.map((item: { code: string }) => item.code)).not.toContain(
        'it',
      );
      // …a second delete finds nothing live, and its code stays reserved.
      expect((await api('delete', `${localesPath()}/${italian.id}`, localeWriteToken)).status).toBe(
        404,
      );
      const german = await prisma.localization.findFirstOrThrow({
        where: { projectId, code: 'de-at' },
      });
      expect(
        (
          await api('patch', `${localesPath()}/${german.id}`, localeWriteToken).send({
            code: 'it',
          })
        ).status,
      ).toBe(409);
      // The rows are still there.
      expect(
        await prisma.versionOnLocalization.count({ where: { localizationId: italian.id } }),
      ).toBe(1);

      const restored = await api(
        'post',
        `${localesPath()}/${italian.id}/restore`,
        localeWriteToken,
      );
      expect(restored.status).toBe(200);
      expect(restored.body).toMatchObject({ id: italian.id, deleted: false });
      const back = await readTranslation(flow, 'it');
      expect(back.body.enabled).toBe(true);
      expect(unitBySource(back.body.units, 'Welcome aboard').translation).toBe('Benvenuti a bordo');
      // Restoring a live locale is a 404 — there is no deleted one with that id.
      expect(
        (await api('post', `${localesPath()}/${italian.id}/restore`, localeWriteToken)).status,
      ).toBe(404);

      // Same again, restored by creating the code a second time.
      await api('delete', `${localesPath()}/${italian.id}`, localeWriteToken);
      const recreated = await createLocale({ code: 'it', name: 'Italiano', locale: 'it-IT' });
      expect(recreated.status).toBe(201);
      expect(recreated.body).toMatchObject({ id: italian.id, name: 'Italiano', restored: true });
      expect(
        unitBySource((await readTranslation(flow, 'it')).body.units, 'Welcome aboard').translation,
      ).toBe('Benvenuti a bordo');
    });

    it('a draft forked while the locale is deleted gets its translation back on restore', async () => {
      const dutch = (await createLocale({ code: 'nl', name: 'Dutch', locale: 'nl-NL' })).body;
      const flow = await newFlow();
      const units: Unit[] = (await readTranslation(flow, 'nl')).body.units;
      await writeTranslation(flow, 'nl', {
        translations: { [unitBySource(units, 'Welcome aboard').path]: 'Welkom aan boord' },
      });
      await publishVersion(prisma, {
        environmentId,
        contentId: flow.contentId,
        versionId: flow.id,
      });

      await api('delete', `${localesPath()}/${dutch.id}`, localeWriteToken);
      const forked = await api(
        'post',
        `/v2/projects/${projectId}/content/${flow.contentId}/versions`,
        writeToken,
      );
      expect(forked.status).toBe(201);
      await api('post', `${localesPath()}/${dutch.id}/restore`, localeWriteToken);

      const draft: Ver = { contentId: flow.contentId, id: forked.body.id };
      expect(
        unitBySource((await readTranslation(draft, 'nl')).body.units, 'Welcome aboard').translation,
      ).toBe('Welkom aan boord');
    });

    it('delivery follows the locale at once: deleted → source text, restored → translation', async () => {
      const spanish = (await createLocale({ code: 'es', name: 'Spanish', locale: 'es-ES' })).body;
      const flow = await newFlow('Welcome aboard');
      const units: Unit[] = (await readTranslation(flow, 'es')).body.units;
      await writeTranslation(flow, 'es', {
        translations: { [unitBySource(units, 'Welcome aboard').path]: 'Bienvenido a bordo' },
        enabled: true,
      });
      await publishVersion(prisma, {
        environmentId,
        contentId: flow.contentId,
        versionId: flow.id,
      });
      const bizUser = await buildBizUser(prisma, { environmentId, data: { locale_code: 'es' } });
      const environment = await prisma.environment.findUniqueOrThrow({
        where: { id: environmentId },
      });

      // What this user is actually served, through the published-version cache.
      const delivered = async (): Promise<string> => {
        const versions = await app
          .get(ContentDataService)
          .findCustomContentVersions(
            { environment, externalUserId: bizUser.externalId },
            [ContentDataType.FLOW],
            flow.id,
          );
        return JSON.stringify(versions.map((version) => version.steps));
      };

      expect(await delivered()).toContain('Bienvenido a bordo');

      await api('delete', `${localesPath()}/${spanish.id}`, localeWriteToken);
      const afterDelete = await delivered();
      expect(afterDelete).toContain('Welcome aboard');
      expect(afterDelete).not.toContain('Bienvenido a bordo');

      await api('post', `${localesPath()}/${spanish.id}/restore`, localeWriteToken);
      expect(await delivered()).toContain('Bienvenido a bordo');
    });
  });

  describe('reading a translation', () => {
    it('returns every unit untranslated for a locale that was never saved', async () => {
      const flow = await newFlow();
      const res = await readTranslation(flow, 'fr');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        object: 'contentVersionLocalization',
        versionId: flow.id,
        code: 'fr',
        name: 'French',
        enabled: false,
        updatedAt: null,
        stats: { total: 2, missing: 2, outdated: 0 },
      });
      const units: Unit[] = res.body.units;
      expect(units.map((unit) => unit.source)).toEqual(['Welcome aboard', 'Continue']);
      expect(units.every((unit) => unit.path.startsWith('steps/'))).toBe(true);
      expect(units.every((unit) => unit.translation === '' && !unit.outdated)).toBe(true);
    });

    it('404s an unknown locale code (E1040) and a foreign version', async () => {
      const flow = await newFlow();
      const unknown = await readTranslation(flow, 'de');
      expect(unknown.status).toBe(404);
      expect(unknown.body.error.code).toBe('E1040');

      const other = await newFlow();
      const mismatched = await readTranslation({ contentId: other.contentId, id: flow.id }, 'fr');
      expect(mismatched.status).toBe(404);
    });

    it('rejects the default locale and a tracker (E1017)', async () => {
      const flow = await newFlow();
      const source = await readTranslation(flow, 'en');
      expect(source.status).toBe(400);
      expect(source.body.error.code).toBe('E1017');

      const tracker = await newVersion('tracker');
      const headless = await readTranslation(tracker, 'fr');
      expect(headless.status).toBe(400);
      expect(headless.body.error.code).toBe('E1017');
    });
  });

  describe('writing a translation', () => {
    it('round-trips translations + enabled, and stores a source snapshot', async () => {
      const flow = await newFlow();
      const units: Unit[] = (await readTranslation(flow, 'fr')).body.units;

      const res = await writeTranslation(flow, 'fr', {
        translations: { [unitBySource(units, 'Welcome aboard').path]: 'Bienvenue à bord' },
        enabled: true,
      });
      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(true);
      expect(res.body.stats).toEqual({ total: 2, missing: 1, outdated: 0 });

      const read: Unit[] = (await readTranslation(flow, 'fr')).body.units;
      expect(unitBySource(read, 'Welcome aboard').translation).toBe('Bienvenue à bord');
      expect(unitBySource(read, 'Continue').translation).toBe('');

      const row = await prisma.versionOnLocalization.findUniqueOrThrow({
        where: { versionId_localizationId: { versionId: flow.id, localizationId: frenchId } },
      });
      const step = await prisma.step.findFirstOrThrow({ where: { versionId: flow.id } });
      // The snapshot is the step's source tree, keyed by cvid.
      expect(row.backup).toEqual({ [step.cvid as string]: step.data });
      expect(Object.keys(row.localized as object)).toEqual([step.cvid]);
    });

    it('merges a later partial write onto the stored translation', async () => {
      const flow = await newFlow();
      const units: Unit[] = (await readTranslation(flow, 'fr')).body.units;
      await writeTranslation(flow, 'fr', {
        translations: { [unitBySource(units, 'Welcome aboard').path]: 'Bienvenue à bord' },
      });
      const second = await writeTranslation(flow, 'fr', {
        translations: { [unitBySource(units, 'Continue').path]: 'Continuer' },
      });
      expect(second.status).toBe(200);
      expect(second.body.stats.missing).toBe(0);
      expect(unitBySource(second.body.units, 'Welcome aboard').translation).toBe(
        'Bienvenue à bord',
      );
    });

    it('flips delivery without touching the stored translation', async () => {
      const flow = await newFlow();
      const units: Unit[] = (await readTranslation(flow, 'fr')).body.units;
      await writeTranslation(flow, 'fr', {
        translations: { [unitBySource(units, 'Continue').path]: 'Continuer' },
      });
      const where = {
        versionId_localizationId: { versionId: flow.id, localizationId: frenchId },
      };
      const before = await prisma.versionOnLocalization.findUniqueOrThrow({ where });

      const res = await writeTranslation(flow, 'fr', { enabled: true });
      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(true);

      const after = await prisma.versionOnLocalization.findUniqueOrThrow({ where });
      expect(after.enabled).toBe(true);
      expect(after.localized).toEqual(before.localized);
      expect(after.backup).toEqual(before.backup);
    });

    it('rejects unknown paths with every offender listed, writing nothing (E1017)', async () => {
      const flow = await newFlow();
      const units: Unit[] = (await readTranslation(flow, 'fr')).body.units;
      const res = await writeTranslation(flow, 'fr', {
        translations: {
          [unitBySource(units, 'Continue').path]: 'Continuer',
          'steps/nope/0.0.0:button.text': 'x',
        },
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E1017');
      expect(JSON.stringify(res.body)).toContain('steps/nope/0.0.0:button.text');

      const row = await prisma.versionOnLocalization.findUnique({
        where: { versionId_localizationId: { versionId: flow.id, localizationId: frenchId } },
      });
      expect(row).toBeNull();
    });

    it('rejects an empty body and unknown fields (E1017)', async () => {
      const flow = await newFlow();
      expect((await writeTranslation(flow, 'fr', {})).status).toBe(400);
      expect((await writeTranslation(flow, 'fr', { localized: {} })).status).toBe(400);
    });

    it('treats empty / all-blank translations as no translation write — outdated flags survive', async () => {
      const flow = await newFlow('Welcome aboard');
      const units: Unit[] = (await readTranslation(flow, 'fr')).body.units;
      const textPath = unitBySource(units, 'Welcome aboard').path;
      await writeTranslation(flow, 'fr', { translations: { [textPath]: 'Bienvenue à bord' } });
      const steps = (await api('get', `${versionPath(flow)}?expand=steps`, readToken)).body.steps;
      await writeSource(flow, {
        steps: [
          {
            ...steps[0],
            content: [
              { type: 'text', markdown: 'Welcome back' },
              { type: 'button', text: 'Continue', actions: [{ type: 'dismiss' }] },
            ],
          },
        ],
      });
      expect((await readTranslation(flow, 'fr')).body.stats.outdated).toBe(1);
      const where = {
        versionId_localizationId: { versionId: flow.id, localizationId: frenchId },
      };
      const before = await prisma.versionOnLocalization.findUniqueOrThrow({ where });

      // An agent flipping delivery on, with an empty / blank map riding along.
      const empty = await writeTranslation(flow, 'fr', { translations: {}, enabled: true });
      expect(empty.status).toBe(200);
      expect(empty.body).toMatchObject({ enabled: true, stats: { outdated: 1 } });
      const blank = await writeTranslation(flow, 'fr', { translations: { [textPath]: '  ' } });
      expect(blank.status).toBe(200);
      expect(blank.body.stats.outdated).toBe(1);

      const after = await prisma.versionOnLocalization.findUniqueOrThrow({ where });
      expect(after.backup).toEqual(before.backup);
      expect(after.localized).toEqual(before.localized);
    });

    it('writes nothing at all for an empty map with no enabled flag', async () => {
      const flow = await newFlow();
      const res = await writeTranslation(flow, 'fr', { translations: {} });
      expect(res.status).toBe(200);
      const row = await prisma.versionOnLocalization.findUnique({
        where: { versionId_localizationId: { versionId: flow.id, localizationId: frenchId } },
      });
      expect(row).toBeNull();
    });

    it('needs content:update', async () => {
      const flow = await newFlow();
      const res = await writeTranslation(flow, 'fr', { enabled: true }, readToken);
      expect(res.status).toBe(403);
    });
  });

  describe('source drift', () => {
    it('marks a translation outdated after a source edit, and a re-save clears it', async () => {
      const flow = await newFlow('Welcome aboard');
      const units: Unit[] = (await readTranslation(flow, 'fr')).body.units;
      const textPath = unitBySource(units, 'Welcome aboard').path;
      await writeTranslation(flow, 'fr', { translations: { [textPath]: 'Bienvenue à bord' } });

      // Echo the step (by id) with new text: the cvid — and the translation — survive.
      const steps = (await api('get', `${versionPath(flow)}?expand=steps`, readToken)).body.steps;
      const edited = await writeSource(flow, {
        steps: [
          {
            ...steps[0],
            content: [
              { type: 'text', markdown: 'Welcome back' },
              { type: 'button', text: 'Continue', actions: [{ type: 'dismiss' }] },
            ],
          },
        ],
      });
      expect(edited.status).toBe(200);

      const drifted = await readTranslation(flow, 'fr');
      expect(unitBySource(drifted.body.units, 'Welcome back')).toMatchObject({
        path: textPath,
        translation: 'Bienvenue à bord',
        outdated: true,
      });
      expect(drifted.body.stats).toEqual({ total: 2, missing: 1, outdated: 1 });

      const summary = await api('get', `${versionPath(flow)}?expand=localizations`, readToken);
      expect(frenchStatus(summary.body.localizations)).toEqual({
        code: 'fr',
        name: 'French',
        enabled: false,
        missing: 1,
        outdated: 1,
      });

      const resaved = await writeTranslation(flow, 'fr', {
        translations: { [textPath]: 'Bon retour' },
      });
      expect(unitBySource(resaved.body.units, 'Welcome back')).toMatchObject({
        translation: 'Bon retour',
        outdated: false,
      });
    });

    it('omits the localization summary without the expand', async () => {
      const flow = await newFlow();
      const res = await api('get', versionPath(flow), readToken);
      expect(res.body.localizations).toBeUndefined();
    });
  });

  describe('published versions', () => {
    it('refuses a write to a published version (E0049), and a fork carries the translation', async () => {
      const flow = await newFlow();
      const units: Unit[] = (await readTranslation(flow, 'fr')).body.units;
      const textPath = unitBySource(units, 'Welcome aboard').path;
      await writeTranslation(flow, 'fr', {
        translations: { [textPath]: 'Bienvenue à bord' },
        enabled: true,
      });
      await publishVersion(prisma, {
        environmentId,
        contentId: flow.contentId,
        versionId: flow.id,
      });

      const locked = await writeTranslation(flow, 'fr', { translations: { [textPath]: 'Salut' } });
      expect(locked.status).toBe(409);
      expect(locked.body.error.code).toBe('E0049');
      // Still readable.
      expect((await readTranslation(flow, 'fr')).status).toBe(200);

      const forked = await api(
        'post',
        `/v2/projects/${projectId}/content/${flow.contentId}/versions`,
        writeToken,
      );
      expect(forked.status).toBe(201);
      const draft: Ver = { contentId: flow.contentId, id: forked.body.id };
      expect(draft.id).not.toBe(flow.id);

      const carried = await readTranslation(draft, 'fr');
      expect(carried.body.enabled).toBe(true);
      // cvid survives the fork, so the unit path does too.
      expect(unitBySource(carried.body.units, 'Welcome aboard')).toMatchObject({
        path: textPath,
        translation: 'Bienvenue à bord',
      });

      const edited = await writeTranslation(draft, 'fr', { translations: { [textPath]: 'Salut' } });
      expect(edited.status).toBe(200);
      // The published version's translation is untouched.
      const published = await readTranslation(flow, 'fr');
      expect(unitBySource(published.body.units, 'Welcome aboard').translation).toBe(
        'Bienvenue à bord',
      );
    });
  });

  describe('media units', () => {
    it('resolves a translated embed url and refuses a non-http media url', async () => {
      const flow = await newVersion('flow');
      const authored = await writeSource(flow, {
        steps: [
          {
            name: 'Media',
            type: 'modal',
            content: [
              { type: 'text', markdown: 'Watch the demo' },
              { type: 'embed', url: 'https://intranet.example.com/demo' },
            ],
          },
        ],
      });
      expect(authored.status).toBe(200);

      const units: Unit[] = (await readTranslation(flow, 'fr')).body.units;
      const embed = unitBySource(units, 'https://intranet.example.com/demo');
      expect(embed.optional).toBe(true);
      // An optional unit left empty is not "missing".
      expect((await readTranslation(flow, 'fr')).body.stats.missing).toBe(1);

      const bad = await writeTranslation(flow, 'fr', {
        translations: { [embed.path]: 'javascript:alert(1)' },
      });
      expect(bad.status).toBe(400);
      expect(JSON.stringify(bad.body)).toContain('media_url');

      const good = await writeTranslation(flow, 'fr', {
        translations: { [embed.path]: 'https://intranet.example.com/demo-fr' },
      });
      expect(good.status).toBe(200);

      const row = await prisma.versionOnLocalization.findUniqueOrThrow({
        where: { versionId_localizationId: { versionId: flow.id, localizationId: frenchId } },
      });
      // The widget renders from parsedUrl, so the swap must carry it.
      expect(JSON.stringify(row.localized)).toContain(
        '"parsedUrl":"https://intranet.example.com/demo-fr"',
      );
    });
  });

  describe('embed resolution', () => {
    // A provider-claimed url, so the lookup path is actually exercised.
    const SOURCE = 'https://www.youtube.com/watch?v=source00000';
    const FRENCH = 'https://www.youtube.com/watch?v=french00000';

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('keeps the stored oembed when an unchanged url is echoed back during a provider outage', async () => {
      const lookup = jest.spyOn(app.get(UtilitiesService), 'queryOembedInfo').mockResolvedValue({
        html: '<iframe src="ok"></iframe>',
        width: 640,
        height: 360,
      } as never);
      const flow = await newVersion('flow');
      const authored = await writeSource(flow, {
        steps: [{ name: 'Media', type: 'modal', content: [{ type: 'embed', url: SOURCE }] }],
      });
      expect(authored.status).toBe(200);
      const [embed]: Unit[] = (await readTranslation(flow, 'fr')).body.units;

      // Surrounding whitespace is dropped before the url is stored.
      const first = await writeTranslation(flow, 'fr', {
        translations: { [embed.path]: `  ${FRENCH} ` },
      });
      expect(first.status).toBe(200);
      expect(first.body.units[0].translation).toBe(FRENCH);
      const where = {
        versionId_localizationId: { versionId: flow.id, localizationId: frenchId },
      };
      const stored = JSON.stringify(
        (await prisma.versionOnLocalization.findUniqueOrThrow({ where })).localized,
      );
      expect(stored).toContain(`"parsedUrl":"${FRENCH}"`);
      expect(stored).toContain('<iframe src=\\"ok\\"></iframe>');

      lookup.mockClear();
      lookup.mockRejectedValue(new Error('provider down'));
      const echoed = await writeTranslation(flow, 'fr', { translations: { [embed.path]: FRENCH } });
      expect(echoed.status).toBe(200);
      // Unchanged url → no lookup at all, so the outage cannot touch it.
      expect(lookup).not.toHaveBeenCalled();
      const kept = JSON.stringify(
        (await prisma.versionOnLocalization.findUniqueOrThrow({ where })).localized,
      );
      expect(kept).toContain('<iframe src=\\"ok\\"></iframe>');
    });
  });

  describe('non-flow content', () => {
    it('translates a banner body through version data', async () => {
      const banner = await newVersion('banner');
      const authored = await writeSource(banner, {
        data: { content: [{ type: 'text', markdown: 'We ship Friday' }] },
      });
      expect(authored.status).toBe(200);

      const units: Unit[] = (await readTranslation(banner, 'fr')).body.units;
      const text = unitBySource(units, 'We ship Friday');
      expect(text.path.startsWith('steps/')).toBe(false);

      const res = await writeTranslation(banner, 'fr', {
        translations: { [text.path]: 'Livraison vendredi' },
        enabled: true,
      });
      expect(res.status).toBe(200);
      expect(unitBySource(res.body.units, 'We ship Friday').translation).toBe('Livraison vendredi');

      const summary = await api('get', `${versionPath(banner)}?expand=localizations`, readToken);
      expect(frenchStatus(summary.body.localizations)).toEqual({
        code: 'fr',
        name: 'French',
        enabled: true,
        missing: 0,
        outdated: 0,
      });
    });
  });
});
