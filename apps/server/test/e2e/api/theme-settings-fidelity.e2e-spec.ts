import { INestApplication } from '@nestjs/common';
import { THEME_SETTING_CONSTRAINTS, ThemeSettingConstraint } from '@usertour/constants';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { WRITABLE_MEDIA_URL_PATHS } from '@/api/themes/settings.schema';

import { gqlData, graphql } from '../auth';
import { buildProject, buildSubscription } from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/**
 * Per-setting write→read fidelity sweep over the ENTIRE theme settings write
 * surface: every SSOT leaf (THEME_SETTING_CONSTRAINTS) plus the writable media
 * URLs — one batch write of a distinct non-current value per path, one read,
 * one value comparison per path, all mismatches reported at once.
 *
 * This is the layer the mechanism tests (strict paths / ranges / round-trip)
 * cannot cover: a value that validates, stores, and comes back CHANGED — or
 * silently not at all. Two rounds run against the same theme so "first write
 * from defaults" and "overwrite an existing custom value" are both proven, and
 * the rounds prefer opposite range bounds so min and max both travel the
 * full write→store→normalize→read path.
 *
 * The `auto*` companion keys are deliberately NOT swept: the server re-derives
 * them from the base colors on every write (deriveThemeAutoColors), so they
 * are outputs of the write, not stored inputs.
 */
describe('API v2 theme settings per-item fidelity (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectId: string;
  let apiToken: string;

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  const basePath = () => `/v2/projects/${projectId}/themes`;
  const send = (method: 'get' | 'post' | 'patch', path: string) =>
    request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${apiToken}`);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'api-v2-theme-fidelity' })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;
    // Business plan so the plan-gated customCss leaf is writable and the sweep
    // covers the full surface.
    await buildSubscription(prisma, { projectId });

    const res = await graphql(app, {
      query: CREATE,
      variables: {
        input: {
          name: 'k',
          scopes: [Capability.ThemeCreate, Capability.ThemeRead, Capability.ThemeUpdate],
          projectIds: [projectId],
        },
      },
      token: ownerToken,
    });
    apiToken = gqlData(res).createApiToken.token;
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.apiToken.deleteMany({ where: { userId: ownerUserId } });
      await prisma.project.update({ where: { id: projectId }, data: { subscriptionId: null } });
      await prisma.subscription.deleteMany({ where: { projectId } });
      await prisma.userOnProject.deleteMany({ where: { projectId } });
      await teardownProject(prisma, projectId);
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
    }
    await app?.close();
  });

  // ---------------------------------------------------------------------------
  // Sweep table: every writable path with its constraint.
  // ---------------------------------------------------------------------------

  type SweepConstraint = ThemeSettingConstraint | { kind: 'media-url' };

  const sweepEntries: Array<[string, SweepConstraint]> = [
    ...(Object.entries(THEME_SETTING_CONSTRAINTS) as Array<[string, ThemeSettingConstraint]>),
    ...WRITABLE_MEDIA_URL_PATHS.map((p): [string, SweepConstraint] => [p, { kind: 'media-url' }]),
  ];

  const getAtPath = (obj: unknown, path: string): unknown =>
    path.split('.').reduce<unknown>((node, key) => {
      if (!node || typeof node !== 'object') return undefined;
      return (node as Record<string, unknown>)[key];
    }, obj);

  const setAtPath = (obj: Record<string, unknown>, path: string, value: unknown): void => {
    const segments = path.split('.');
    let node = obj;
    for (const seg of segments.slice(0, -1)) {
      if (!node[seg] || typeof node[seg] !== 'object') node[seg] = {};
      node = node[seg] as Record<string, unknown>;
    }
    node[segments[segments.length - 1]] = value;
  };

  /** A distinct hex per index; bumps until it differs from `current`. */
  const hexAt = (index: number, current: unknown): string => {
    let n = (0x111111 + index * 0x02040b) & 0xffffff;
    let hex = `#${n.toString(16).padStart(6, '0')}`;
    while (hex === current) {
      n = (n + 1) & 0xffffff;
      hex = `#${n.toString(16).padStart(6, '0')}`;
    }
    return hex;
  };

  /**
   * A valid value for the path that is guaranteed to differ from `current`.
   * `preferMax` flips which range bound numbers aim for, so the two rounds
   * exercise both bounds.
   */
  const sweepValue = (
    c: SweepConstraint,
    current: unknown,
    index: number,
    round: number,
  ): unknown => {
    switch (c.kind) {
      case 'number': {
        const min = c.min ?? -50;
        const max = c.max ?? 500;
        const preferMax = round % 2 === 1;
        const candidates = preferMax ? [max, max - 1, min, min + 1] : [min, min + 1, max, max - 1];
        return candidates.find((v) => v !== current);
      }
      case 'color':
        return hexAt(index + round * 1000, current);
      case 'enum':
        return c.values.find((v) => v !== current);
      case 'boolean':
        return !current;
      case 'string':
        return `sweep-r${round}-${index}`;
      case 'media-url':
        return `https://cdn.example.com/sweep/r${round}-${index}.png`;
    }
  };

  it('covers the whole writable surface: 155 SSOT leaves + 3 media URLs', () => {
    // Tripwire: adding a setting to the SSOT (or a writable media path) must
    // grow this sweep — update the count AND the coverage ledger.
    expect(Object.keys(THEME_SETTING_CONSTRAINTS)).toHaveLength(155);
    expect(WRITABLE_MEDIA_URL_PATHS).toHaveLength(3);
    expect(sweepEntries).toHaveLength(158);
  });

  it('every setting written comes back with the exact value, twice over', async () => {
    const created = await send('post', basePath()).send({ name: 'Fidelity sweep' });
    expect(created.status).toBe(201);
    const themeId = created.body.id;

    for (const round of [1, 2]) {
      const before = await send('get', `${basePath()}/${themeId}?expand=settings`);
      expect(before.status).toBe(200);

      const patch: Record<string, unknown> = {};
      const expected = new Map<string, unknown>();
      sweepEntries.forEach(([path, constraint], index) => {
        const value = sweepValue(constraint, getAtPath(before.body.settings, path), index, round);
        setAtPath(patch, path, value);
        expected.set(path, value);
      });

      const written = await send('patch', `${basePath()}/${themeId}`).send({ settings: patch });
      expect(written.status).toBe(200);

      const after = await send('get', `${basePath()}/${themeId}?expand=settings`);
      expect(after.status).toBe(200);

      const mismatches = sweepEntries
        .map(([path]) => ({
          path,
          wrote: expected.get(path),
          read: getAtPath(after.body.settings, path),
        }))
        .filter(({ wrote, read }) => read !== wrote);
      expect(mismatches).toEqual([]);
    }
  }, 60000);

  it("writes 'Auto' to every Auto-capable color and reads 'Auto' back, companions derived", async () => {
    const created = await send('post', basePath()).send({ name: 'Auto sweep' });
    expect(created.status).toBe(201);
    const themeId = created.body.id;

    const autoPaths = (
      Object.entries(THEME_SETTING_CONSTRAINTS) as Array<[string, ThemeSettingConstraint]>
    )
      .filter(([, c]) => c.kind === 'color' && c.allowAuto)
      .map(([path]) => path);
    expect(autoPaths.length).toBeGreaterThan(20);

    const patch: Record<string, unknown> = {};
    for (const path of autoPaths) setAtPath(patch, path, 'Auto');

    const written = await send('patch', `${basePath()}/${themeId}`).send({ settings: patch });
    expect(written.status).toBe(200);

    const after = await send('get', `${basePath()}/${themeId}?expand=settings`);
    const notAuto = autoPaths
      .map((path) => ({ path, read: getAtPath(after.body.settings, path) }))
      .filter(({ read }) => read !== 'Auto');
    expect(notAuto).toEqual([]);

    // 'Auto' is only renderable because the server derived the concrete
    // companions from the base colors on write.
    expect(after.body.settings.brandColor.autoHover).toMatch(/^#[0-9a-f]{6}$/i);
    expect(after.body.settings.brandColor.autoActive).toMatch(/^#[0-9a-f]{6}$/i);
    expect(after.body.settings.mainColor.autoHover).toMatch(/^#[0-9a-f]{6}$/i);
  }, 60000);
});
