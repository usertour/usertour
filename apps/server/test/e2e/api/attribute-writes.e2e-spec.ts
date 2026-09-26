import { INestApplication } from '@nestjs/common';
import { BizAttributeTypes, Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { AttributeBizType } from '@/modules/attributes/constants/attribute-biz-type.constant';
import { BizService } from '@/modules/biz/services/biz.service';
import { gqlData, graphql } from '../auth';
import { createTestApp } from '../create-test-app';
import { buildAuthorizedUser } from '../gql/_support';
import { OpenApiFixture, seedApiFixture, teardownApiFixture } from '../openapi';

/**
 * Attribute write operations (ADR 0017) through the v2 write surface, which
 * shares the domain resolution with the SDK path: literal / null / operation
 * objects, lossless coercion to the definition type, `data_type` pinning on
 * first creation only, and the row lock that keeps concurrent `add`s exact.
 */
describe('API v2 attribute write operations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let fx: OpenApiFixture;
  let ownerUserId: string;
  let token: string;

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  const base = () => `/v2/projects/${fx.projectId}/environments/${fx.environmentId}`;
  const putUser = (id: string, attributes: Record<string, unknown>) =>
    request(app.getHttpServer())
      .put(`${base()}/users/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ attributes });
  const putCompany = (id: string, attributes: Record<string, unknown>) =>
    request(app.getHttpServer())
      .put(`${base()}/companies/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ attributes });
  const putMembership = (companyId: string, userId: string, attributes: Record<string, unknown>) =>
    request(app.getHttpServer())
      .put(`${base()}/companies/${companyId}/memberships/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ attributes });
  const track = (userId: string, name: string, attributes: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post(`${base()}/events`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId, name, attributes });
  const definition = (codeName: string, bizType: number = AttributeBizType.USER) =>
    prisma.attribute.findFirst({ where: { projectId: fx.projectId, bizType, codeName } });
  const userRow = (externalId: string) =>
    prisma.bizUser.findFirst({ where: { environmentId: fx.environmentId, externalId } });
  const stored = async (externalId: string) =>
    ((await userRow(externalId))?.data as Record<string, unknown>) ?? {};

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    fx = await seedApiFixture(prisma, { projectName: 'api-v2-attribute-writes' });
    const owner = await buildAuthorizedUser(prisma, app, {
      projectId: fx.projectId,
      role: 'OWNER',
    });
    ownerUserId = owner.user.id;
    const minted = await graphql(app, {
      query: CREATE,
      variables: {
        input: {
          name: 'attribute-writes',
          scopes: [
            Capability.UserWrite,
            Capability.UserRead,
            Capability.CompanyWrite,
            Capability.CompanyRead,
          ],
          projectIds: [fx.projectId],
          environmentIds: [fx.environmentId],
        },
      },
      token: owner.token,
    });
    token = gqlData(minted).createApiToken.token;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.apiToken.deleteMany({ where: { userId: ownerUserId } });
      await prisma.userOnProject.deleteMany({ where: { projectId: fx.projectId } });
      await teardownApiFixture(prisma, fx);
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
    }
    await app?.close();
  });

  describe('operations', () => {
    it('set_once writes an absent key, keeps a present one, and works again after a removal', async () => {
      const first = await putUser('aw-once', { signup_source: { set_once: 'google' } });
      expect(first.status).toBe(200);
      expect(first.body.attributes.signup_source).toBe('google');

      const second = await putUser('aw-once', { signup_source: { set_once: 'direct' } });
      expect(second.body.attributes.signup_source).toBe('google');

      await putUser('aw-once', { signup_source: null });
      const third = await putUser('aw-once', { signup_source: { set_once: 'direct' } });
      expect(third.body.attributes.signup_source).toBe('direct');
    });

    it('add starts at 0, accumulates, accepts negatives, and defines a Number attribute', async () => {
      const first = await putUser('aw-add', { aw_widget_count: { add: 2 } });
      expect(first.status).toBe(200);
      expect(first.body.attributes.aw_widget_count).toBe(2);
      expect((await definition('aw_widget_count'))?.dataType).toBe(BizAttributeTypes.Number);

      const second = await putUser('aw-add', { aw_widget_count: { add: 1.5 } });
      expect(second.body.attributes.aw_widget_count).toBe(3.5);

      const third = await putUser('aw-add', { aw_widget_count: { add: -3.5 } });
      expect(third.body.attributes.aw_widget_count).toBe(0);
    });

    it('union appends new elements only, keeps order, and defines a List attribute', async () => {
      const first = await putUser('aw-union', { aw_features: { union: ['export', 'share'] } });
      expect(first.body.attributes.aw_features).toEqual(['export', 'share']);
      expect((await definition('aw_features'))?.dataType).toBe(BizAttributeTypes.List);

      const second = await putUser('aw-union', { aw_features: { union: ['share', 'api'] } });
      expect(second.body.attributes.aw_features).toEqual(['export', 'share', 'api']);

      const third = await putUser('aw-union', { aw_features: { union: 'export' } });
      expect(third.body.attributes.aw_features).toEqual(['export', 'share', 'api']);
    });

    it('remove drops every match, keeps an emptied list, and never defines an unknown attribute', async () => {
      const untouched = await putUser('aw-remove', { aw_never_defined: { remove: 'x' } });
      expect(untouched.status).toBe(200);
      expect(untouched.body.attributes).not.toHaveProperty('aw_never_defined');
      expect(await definition('aw_never_defined')).toBeNull();

      await putUser('aw-remove', { aw_flags: ['a', 'b', 'c'] });
      const removed = await putUser('aw-remove', { aw_flags: { remove: ['a', 'c', 'zzz'] } });
      expect(removed.body.attributes.aw_flags).toEqual(['b']);

      const emptied = await putUser('aw-remove', { aw_flags: { remove: 'b' } });
      expect(emptied.body.attributes.aw_flags).toEqual([]);

      // An emptied list is empty to the segment filter, as it is to the
      // client-side evaluator — and Prisma runs the `[]` comparison.
      const byEmpty = await prisma.bizUser.findFirst({
        where: {
          environmentId: fx.environmentId,
          externalId: 'aw-remove',
          data: { path: ['aw_flags'], equals: [] },
        },
      });
      expect(byEmpty).not.toBeNull();
      const byAny = await prisma.bizUser.findFirst({
        where: {
          environmentId: fx.environmentId,
          externalId: 'aw-remove',
          data: { path: ['aw_flags'], not: [] },
        },
      });
      expect(byAny).toBeNull();
    });

    it('a null hole in a stored list is dropped, never the list', async () => {
      // Lists stored before elements were validated may hold a null.
      await putUser('aw-holes', { aw_roles: ['admin'] });
      const row = await userRow('aw-holes');
      await prisma.bizUser.update({
        where: { id: row!.id },
        data: { data: { ...(row!.data as Record<string, unknown>), aw_roles: ['admin', null] } },
      });
      const unioned = await putUser('aw-holes', { aw_roles: { union: 'editor' } });
      expect(unioned.body.attributes.aw_roles).toEqual(['admin', 'editor']);
    });

    it('null removes the key; a literal and {set} both replace', async () => {
      await putUser('aw-null', { plan: 'free', seats: 3 });
      const res = await putUser('aw-null', { plan: null, seats: { set: 5 } });
      expect(res.body.attributes).not.toHaveProperty('plan');
      expect(res.body.attributes.seats).toBe(5);
    });
  });

  describe('types', () => {
    it('data_type pins the type of a new definition and coerces the value', async () => {
      const res = await putUser('aw-pin', {
        aw_external_ref: { set: '2024-12-12T00:00:00.000Z', data_type: 'string' },
        aw_invoice_no: { set_once: 10023, data_type: 'string' },
        aw_signed_flag: { set: 'true', data_type: 'boolean' },
      });
      expect(res.status).toBe(200);
      expect(res.body.attributes).toMatchObject({
        aw_external_ref: '2024-12-12T00:00:00.000Z',
        aw_invoice_no: '10023',
        aw_signed_flag: true,
      });
      expect((await definition('aw_external_ref'))?.dataType).toBe(BizAttributeTypes.String);
      expect((await definition('aw_invoice_no'))?.dataType).toBe(BizAttributeTypes.String);
      expect((await definition('aw_signed_flag'))?.dataType).toBe(BizAttributeTypes.Boolean);
    });

    it('a conflicting data_type never retypes an existing definition — it is a 400 type mismatch', async () => {
      await putUser('aw-conflict', { aw_pinned: { set: 'x', data_type: 'string' } });
      const res = await putUser('aw-conflict', { aw_pinned: { set: 1, data_type: 'number' } });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E1017');
      expect(res.body.error.message).toMatch(/type mismatch/i);
      expect((await definition('aw_pinned'))?.dataType).toBe(BizAttributeTypes.String);
    });

    it('a value that cannot be coerced to the pinned data_type is refused and defines nothing', async () => {
      const res = await putUser('aw-badpin', { aw_bad_pin: { set: 'abc', data_type: 'number' } });
      expect(res.status).toBe(400);
      expect(await definition('aw_bad_pin')).toBeNull();
    });

    it('values are coerced losslessly to the definition type', async () => {
      await putUser('aw-coerce', {
        aw_phone: 'seed',
        aw_seats: 1,
        aw_when: '2024-01-01T00:00:00.000Z',
        aw_tags: ['a'],
      });
      const res = await putUser('aw-coerce', {
        aw_phone: 12345678,
        aw_seats: '42',
        aw_when: '2024-12-12T08:30:00+08:00',
        aw_tags: 'b',
      });
      expect(res.status).toBe(200);
      expect(res.body.attributes).toMatchObject({
        aw_phone: '12345678',
        aw_seats: 42,
        aw_when: '2024-12-12T00:30:00.000Z',
        aw_tags: ['b'],
      });
    });

    it.each([
      ['a lossy numeric string into Number', { aw_seats: '007' }],
      ['an epoch into DateTime', { aw_when: 1733961600000 }],
      ['add on a String attribute', { aw_phone: { add: 1 } }],
      ['union on a Number attribute', { aw_seats: { union: 'x' } }],
    ])('%s is a 400 type mismatch', async (_, attributes) => {
      const res = await putUser('aw-coerce', attributes);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E1017');
      expect(res.body.error.message).toMatch(/type mismatch/i);
    });

    it('a strict UTC value is stored as sent, so re-sending it changes nothing', async () => {
      const first = await putUser('aw-utc', {
        aw_stamp: { set: '2024-01-01T00:00:00Z', data_type: 'datetime' },
      });
      expect(first.body.attributes.aw_stamp).toBe('2024-01-01T00:00:00Z');
      expect((await definition('aw_stamp'))?.dataType).toBe(BizAttributeTypes.DateTime);
      const before = (await userRow('aw-utc'))!.updatedAt;

      const again = await putUser('aw-utc', { aw_stamp: '2024-01-01T00:00:00Z' });
      expect(again.status).toBe(200);
      expect((await userRow('aw-utc'))!.updatedAt).toEqual(before);
    });

    it('a year-one date-time keeps its year when it is rewritten', async () => {
      const res = await putUser('aw-year-one', {
        aw_zero_time: { set: '0001-01-01T08:00:00+08:00', data_type: 'datetime' },
      });
      expect(res.body.attributes.aw_zero_time).toBe('0001-01-01T00:00:00.000Z');
    });

    it('a DateTime attribute whose values are ISO strings can become a String, not a Number', async () => {
      await putUser('aw-retype', {
        aw_retype_at: { set: '2024-01-01T00:00:00.000Z', data_type: 'datetime' },
      });
      const biz = app.get(BizService);
      await expect(
        biz.assertStoredValuesFitDataType(
          fx.projectId,
          AttributeBizType.USER,
          'aw_retype_at',
          BizAttributeTypes.String,
        ),
      ).resolves.toBeUndefined();
      await expect(
        biz.assertStoredValuesFitDataType(
          fx.projectId,
          AttributeBizType.USER,
          'aw_retype_at',
          BizAttributeTypes.Number,
        ),
      ).rejects.toThrow();
    });

    it('inference stays strict: an offset ISO string on a new attribute is a String', async () => {
      const res = await putUser('aw-infer', { aw_offset_first: '2024-12-12T08:30:00+08:00' });
      expect(res.body.attributes.aw_offset_first).toBe('2024-12-12T08:30:00+08:00');
      expect((await definition('aw_offset_first'))?.dataType).toBe(BizAttributeTypes.String);
    });
  });

  describe('shape', () => {
    it.each([
      ['an empty object', {}],
      ['two operations', { add: 1, union: 'x' }],
      ['an unknown key', { foo: 1 }],
      ['a nested object', { set: { a: 1 } }],
      ['data_type without set', { add: 1, data_type: 'number' }],
      ['a non-numeric add', { add: '1' }],
      ['the legacy subtract', { subtract: 1 }],
      ['the legacy append', { append: ['x'] }],
    ])('%s is a 400 and stores nothing', async (_, value) => {
      const res = await putUser('aw-shape', { aw_shape: value });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E1017');
      expect(await definition('aw_shape')).toBeNull();
    });
  });

  describe('companies and memberships', () => {
    it('a locked user row does not block a membership insert that references it', async () => {
      await putUser('aw-lock-user', { aw_lock_hits: 0 });
      await putCompany('aw-lock-co', { aw_lock_plan: 'pro' });
      const biz = app.get(BizService);
      let release: () => void = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      // Hold the user row the way every attribute write does, with a change
      // so the lock is really taken, and keep the transaction open.
      const holder = prisma.$transaction(
        async (tx) => {
          await biz.upsertBizUsers(
            tx,
            'aw-lock-user',
            { aw_lock_hits: { add: 1 } },
            fx.environmentId,
          );
          await gate;
        },
        { timeout: 15000 },
      );
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Inserting the membership takes KEY SHARE on the user row through its
      // foreign key; FOR UPDATE would block it until the holder commits.
      const insert = putMembership('aw-lock-co', 'aw-lock-user', { aw_lock_role: 'admin' }).then(
        (res) => res.status,
      );
      const outcome = await Promise.race([
        insert,
        new Promise<string>((resolve) => setTimeout(() => resolve('blocked'), 3000)),
      ]);
      release();
      await holder;
      expect(outcome).toBe(200);
    });

    it('company attributes take the same operations', async () => {
      await putCompany('aw-co', { aw_seats_used: { add: 3 }, aw_regions: { union: 'eu' } });
      const res = await putCompany('aw-co', {
        aw_seats_used: { add: -1 },
        aw_regions: { union: ['us', 'eu'] },
      });
      expect(res.status).toBe(200);
      expect(res.body.attributes).toMatchObject({ aw_seats_used: 2, aw_regions: ['eu', 'us'] });
      expect((await definition('aw_seats_used', AttributeBizType.COMPANY))?.dataType).toBe(
        BizAttributeTypes.Number,
      );
    });

    it('a membership created with a null stores no JSON null, so set_once still sees an empty slot', async () => {
      await putUser('aw-member', { name: 'Member' });
      await putCompany('aw-co-m', {});
      const created = await putMembership('aw-co-m', 'aw-member', { aw_role: null, aw_level: 1 });
      expect(created.status).toBe(200);
      expect(created.body.attributes).toEqual({ aw_level: 1 });

      const once = await putMembership('aw-co-m', 'aw-member', { aw_role: { set_once: 'admin' } });
      expect(once.body.attributes.aw_role).toBe('admin');
    });
  });

  describe('creation', () => {
    it('a set_once first_seen_at on creation is the first value the row has', async () => {
      const res = await putUser('aw-born', {
        first_seen_at: { set_once: '2020-01-01T00:00:00.000Z' },
      });
      expect(res.status).toBe(200);
      expect((await stored('aw-born')).first_seen_at).toBe('2020-01-01T00:00:00.000Z');
    });

    it('a null on creation leaves the seeded first_seen_at in place', async () => {
      const res = await putUser('aw-born-null', { first_seen_at: null });
      expect(res.status).toBe(200);
      expect(typeof (await stored('aw-born-null')).first_seen_at).toBe('string');
    });
  });

  describe('events', () => {
    it('event attributes take literals and {set, data_type}; other operations are refused', async () => {
      const ok = await track('aw-ev', 'aw_checkout', {
        amount: 12.5,
        aw_coupon: { set: 2024, data_type: 'string' },
      });
      expect(ok.status).toBe(201);
      expect(ok.body.attributes).toMatchObject({ amount: 12.5, aw_coupon: '2024' });
      expect((await definition('aw_coupon', AttributeBizType.EVENT))?.dataType).toBe(
        BizAttributeTypes.String,
      );

      const refused = await track('aw-ev', 'aw_checkout', { amount: { add: 1 } });
      expect(refused.status).toBe(400);
      expect(refused.body.error.code).toBe('E1017');
    });
  });

  describe('concurrency', () => {
    it('parallel adds on one user are all counted (row lock)', async () => {
      const parallel = 12;
      await putUser('aw-race', { aw_hits: 0 });
      const results = await Promise.all(
        Array.from({ length: parallel }, () => putUser('aw-race', { aw_hits: { add: 1 } })),
      );
      for (const res of results) {
        expect(res.status).toBe(200);
      }
      const row = await prisma.bizUser.findFirst({
        where: { environmentId: fx.environmentId, externalId: 'aw-race' },
      });
      expect((row?.data as Record<string, unknown>).aw_hits).toBe(parallel);
    });

    it('parallel first writes of one new codeName all succeed and define it once', async () => {
      const parallel = 8;
      const results = await Promise.all(
        Array.from({ length: parallel }, (_, i) =>
          putUser(`aw-def-${i}`, { aw_brand_new: i, aw_brand_new_b: `v${i}` }),
        ),
      );
      for (const [i, res] of results.entries()) {
        expect(res.status).toBe(200);
        expect(res.body.attributes).toMatchObject({ aw_brand_new: i, aw_brand_new_b: `v${i}` });
      }
      expect(
        await prisma.attribute.count({
          where: {
            projectId: fx.projectId,
            bizType: AttributeBizType.USER,
            codeName: { in: ['aw_brand_new', 'aw_brand_new_b'] },
          },
        }),
      ).toBe(2);
    });
  });
});
