import { INestApplication } from '@nestjs/common';
import { BizAttributeTypes, Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { AttributeBizType } from '@/modules/attributes/constants/attribute-biz-type.constant';
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
  });
});
