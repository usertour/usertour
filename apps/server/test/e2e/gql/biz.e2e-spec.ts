import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { graphql, gqlData } from '../auth';
import { createTestApp } from '../create-test-app';
import {
  buildBizCompany,
  buildBizUser,
  buildBizUserOnCompany,
  buildEnvironment,
  buildEvent,
  buildProject,
  buildSegment,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';

/**
 * Functional e2e for the `biz` GraphQL resolver (biz users / companies /
 * segments / events) — follows the themes template: run as an authorized OWNER,
 * assert each mutation's effect in the DB (not just the response), cover key
 * read/error cases. Auth (who-can-call) is already covered by
 * permission.e2e-spec; here we run as OWNER.
 *
 * Resolver semantics worth noting:
 *  - The `query*` ops are relay-paginated: they take a `BizQuery`/`BizEventQuery`
 *    (carrying `environmentId`) + pagination (first/after) + an orderBy, and
 *    return `{ edges { node }, totalCount, pageInfo }`.
 *  - There is no factory for BizEvent, so the event tests seed rows inline via
 *    `prisma.bizEvent.create` (an Event + a BizUser, same environment).
 *  - Segment scope: update/delete + the *OnSegment ops are Segment-scoped — the
 *    permission guard derives the project from the segment id, so every segment
 *    under test carries a `projectId` (createSegment sets it from the env;
 *    buildSegment sets it directly).
 *  - The *OnSegment ops add/remove biz users/companies to a MANUAL segment; the
 *    join rows (BizUserOnSegment / BizCompanyOnSegment) are asserted via prisma.
 *  - deleteBizUser/deleteBizCompany take `{ ids, environmentId }` and return
 *    `{ success, count }`; the spec asserts the rows are gone in the DB.
 */
describe('GraphQL biz (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let token: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'gql-biz' });
    projectId = project.id;
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

  // SegmentBizType / SegmentDataType are registered as GraphQL enums whose wire
  // values are the enum NAMES (USER/COMPANY, ALL/CONDITION/MANUAL); the resolver
  // receives the numeric values (USER=1, COMPANY=2; ALL=1, CONDITION=2, MANUAL=3)
  // and the DB stores those ints. So GraphQL vars use names, prisma reads ints.
  const createSegment = (
    name: string,
    bizType = 'USER',
    dataType = 'MANUAL',
    columns?: Array<{ codeName: string; visible: boolean }>,
  ) =>
    graphql(app, {
      token,
      query: `mutation ($data: CreatSegment!) {
        createSegment(data: $data) {
          id name projectId environmentId bizType dataType columns
        }
      }`,
      variables: { data: { name, environmentId, bizType, dataType, columns } },
    });

  // ── queryBizUser ─────────────────────────────────────────────────────────

  describe('queryBizUser', () => {
    it('returns a seeded biz user for the environment', async () => {
      const bizUser = await buildBizUser(prisma, { environmentId });
      const res = await graphql(app, {
        token,
        query: `query ($query: BizQuery!, $orderBy: BizOrder!, $first: Int) {
          queryBizUser(query: $query, orderBy: $orderBy, first: $first) {
            totalCount
            edges { node { id externalId environmentId } }
          }
        }`,
        variables: {
          query: { environmentId },
          orderBy: { field: 'createdAt', direction: 'desc' },
          first: 50,
        },
      });
      const conn = gqlData(res).queryBizUser;
      const ids = conn.edges.map((e: { node: { id: string } }) => e.node.id);
      expect(ids).toContain(bizUser.id);
      expect(conn.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('filters by userId and returns only that user', async () => {
      const target = await buildBizUser(prisma, { environmentId });
      await buildBizUser(prisma, { environmentId });
      const res = await graphql(app, {
        token,
        query: `query ($query: BizQuery!, $orderBy: BizOrder!, $first: Int) {
          queryBizUser(query: $query, orderBy: $orderBy, first: $first) {
            totalCount
            edges { node { id } }
          }
        }`,
        variables: {
          query: { environmentId, userId: target.id },
          orderBy: { field: 'createdAt', direction: 'desc' },
          first: 50,
        },
      });
      const conn = gqlData(res).queryBizUser;
      expect(conn.totalCount).toBe(1);
      expect(conn.edges[0].node.id).toBe(target.id);
    });

    it('filters by companyId via membership', async () => {
      const company = await buildBizCompany(prisma, { environmentId });
      const member = await buildBizUser(prisma, { environmentId });
      await buildBizUserOnCompany(prisma, {
        bizUserId: member.id,
        bizCompanyId: company.id,
      });
      // A user with no membership to `company` should be excluded.
      await buildBizUser(prisma, { environmentId });
      const res = await graphql(app, {
        token,
        query: `query ($query: BizQuery!, $orderBy: BizOrder!, $first: Int) {
          queryBizUser(query: $query, orderBy: $orderBy, first: $first) {
            totalCount
            edges { node { id } }
          }
        }`,
        variables: {
          query: { environmentId, companyId: company.id },
          orderBy: { field: 'createdAt', direction: 'desc' },
          first: 50,
        },
      });
      const conn = gqlData(res).queryBizUser;
      const ids = conn.edges.map((e: { node: { id: string } }) => e.node.id);
      expect(ids).toEqual([member.id]);
      expect(conn.totalCount).toBe(1);
    });
  });

  // ── queryBizCompany ──────────────────────────────────────────────────────

  describe('queryBizCompany', () => {
    it('returns a seeded biz company for the environment', async () => {
      const company = await buildBizCompany(prisma, { environmentId });
      const res = await graphql(app, {
        token,
        query: `query ($query: BizQuery!, $orderBy: BizOrder!, $first: Int) {
          queryBizCompany(query: $query, orderBy: $orderBy, first: $first) {
            totalCount
            edges { node { id externalId environmentId } }
          }
        }`,
        variables: {
          query: { environmentId },
          orderBy: { field: 'createdAt', direction: 'desc' },
          first: 50,
        },
      });
      const conn = gqlData(res).queryBizCompany;
      const ids = conn.edges.map((e: { node: { id: string } }) => e.node.id);
      expect(ids).toContain(company.id);
    });

    it('excludes soft-deleted companies', async () => {
      const company = await buildBizCompany(prisma, { environmentId, deleted: true });
      const res = await graphql(app, {
        token,
        query: `query ($query: BizQuery!, $orderBy: BizOrder!, $first: Int) {
          queryBizCompany(query: $query, orderBy: $orderBy, first: $first) {
            edges { node { id } }
          }
        }`,
        variables: {
          query: { environmentId },
          orderBy: { field: 'createdAt', direction: 'desc' },
          first: 50,
        },
      });
      const ids = gqlData(res).queryBizCompany.edges.map(
        (e: { node: { id: string } }) => e.node.id,
      );
      expect(ids).not.toContain(company.id);
    });

    it('filters by companyId and returns only that company', async () => {
      const target = await buildBizCompany(prisma, { environmentId });
      await buildBizCompany(prisma, { environmentId });
      const res = await graphql(app, {
        token,
        query: `query ($query: BizQuery!, $orderBy: BizOrder!, $first: Int) {
          queryBizCompany(query: $query, orderBy: $orderBy, first: $first) {
            totalCount
            edges { node { id } }
          }
        }`,
        variables: {
          query: { environmentId, companyId: target.id },
          orderBy: { field: 'createdAt', direction: 'desc' },
          first: 50,
        },
      });
      const conn = gqlData(res).queryBizCompany;
      expect(conn.totalCount).toBe(1);
      expect(conn.edges[0].node.id).toBe(target.id);
    });
  });

  // ── queryBizUserEvents ───────────────────────────────────────────────────

  describe('queryBizUserEvents', () => {
    it('returns events for a biz user (seeded inline)', async () => {
      const bizUser = await buildBizUser(prisma, { environmentId });
      const event = await buildEvent(prisma, { projectId, codeName: 'user_signed_in' });
      const bizEvent = await prisma.bizEvent.create({
        data: {
          eventId: event.id,
          bizUserId: bizUser.id,
          data: { source: 'e2e' },
        },
      });

      const res = await graphql(app, {
        token,
        query: `query ($query: BizEventQuery!, $orderBy: BizOrder!, $first: Int) {
          queryBizUserEvents(query: $query, orderBy: $orderBy, first: $first) {
            totalCount
            edges { node { id eventId bizUserId event { id codeName } } }
          }
        }`,
        variables: {
          query: { environmentId, userId: bizUser.id },
          orderBy: { field: 'createdAt', direction: 'desc' },
          first: 50,
        },
      });
      const conn = gqlData(res).queryBizUserEvents;
      expect(conn.totalCount).toBe(1);
      const node = conn.edges[0].node;
      expect(node.id).toBe(bizEvent.id);
      expect(node.eventId).toBe(event.id);
      expect(node.bizUserId).toBe(bizUser.id);
      expect(node.event).toMatchObject({ id: event.id, codeName: 'user_signed_in' });
    });

    it('returns no events for a user without any', async () => {
      const bizUser = await buildBizUser(prisma, { environmentId });
      const res = await graphql(app, {
        token,
        query: `query ($query: BizEventQuery!, $orderBy: BizOrder!, $first: Int) {
          queryBizUserEvents(query: $query, orderBy: $orderBy, first: $first) {
            totalCount
            edges { node { id } }
          }
        }`,
        variables: {
          query: { environmentId, userId: bizUser.id },
          orderBy: { field: 'createdAt', direction: 'desc' },
          first: 50,
        },
      });
      const conn = gqlData(res).queryBizUserEvents;
      expect(conn.totalCount).toBe(0);
      expect(conn.edges).toEqual([]);
    });
  });

  // ── queryBizCompanyEvents ────────────────────────────────────────────────

  describe('queryBizCompanyEvents', () => {
    it('returns events linked to a biz company (seeded inline)', async () => {
      const bizUser = await buildBizUser(prisma, { environmentId });
      const company = await buildBizCompany(prisma, { environmentId });
      const event = await buildEvent(prisma, { projectId, codeName: 'company_event' });
      const bizEvent = await prisma.bizEvent.create({
        data: {
          eventId: event.id,
          bizUserId: bizUser.id,
          bizCompanyId: company.id,
          data: {},
        },
      });

      const res = await graphql(app, {
        token,
        query: `query ($query: BizEventQuery!, $orderBy: BizOrder!, $first: Int) {
          queryBizCompanyEvents(query: $query, orderBy: $orderBy, first: $first) {
            totalCount
            edges { node { id eventId bizCompanyId event { codeName } } }
          }
        }`,
        variables: {
          query: { environmentId, companyId: company.id },
          orderBy: { field: 'createdAt', direction: 'desc' },
          first: 50,
        },
      });
      const conn = gqlData(res).queryBizCompanyEvents;
      const ids = conn.edges.map((e: { node: { id: string } }) => e.node.id);
      expect(ids).toContain(bizEvent.id);
      const node = conn.edges.find((e: { node: { id: string } }) => e.node.id === bizEvent.id).node;
      expect(node.bizCompanyId).toBe(company.id);
      expect(node.event.codeName).toBe('company_event');
    });

    it('returns no events for a company without any', async () => {
      const company = await buildBizCompany(prisma, { environmentId });
      const res = await graphql(app, {
        token,
        query: `query ($query: BizEventQuery!, $orderBy: BizOrder!, $first: Int) {
          queryBizCompanyEvents(query: $query, orderBy: $orderBy, first: $first) {
            totalCount
            edges { node { id } }
          }
        }`,
        variables: {
          query: { environmentId, companyId: company.id },
          orderBy: { field: 'createdAt', direction: 'desc' },
          first: 50,
        },
      });
      const conn = gqlData(res).queryBizCompanyEvents;
      expect(conn.totalCount).toBe(0);
      expect(conn.edges).toEqual([]);
    });
  });

  // ── createSegment ────────────────────────────────────────────────────────

  describe('createSegment', () => {
    it('creates a segment and persists it with the env project', async () => {
      const seg = gqlData(await createSegment('Active users')).createSegment;
      expect(seg).toMatchObject({
        name: 'Active users',
        environmentId,
        projectId,
        bizType: 'USER',
        dataType: 'MANUAL',
      });

      const row = await prisma.segment.findUnique({ where: { id: seg.id } });
      // bizType USER = 1, dataType MANUAL = 3 in the DB.
      expect(row).toMatchObject({
        name: 'Active users',
        environmentId,
        projectId,
        bizType: 1,
        dataType: 3,
      });
    });

    it('defaults columns from the bizType when none are provided', async () => {
      const seg = gqlData(await createSegment('Auto columns', 'USER', 'MANUAL')).createSegment;
      expect(Array.isArray(seg.columns)).toBe(true);
      expect(seg.columns.length).toBeGreaterThan(0);
    });

    it('normalizes explicitly-provided columns', async () => {
      const seg = gqlData(
        await createSegment('Explicit columns', 'USER', 'MANUAL', [
          { codeName: 'email', visible: true },
          { codeName: 'name', visible: false },
        ]),
      ).createSegment;
      expect(seg.columns).toEqual([
        { codeName: 'email', visible: true },
        { codeName: 'name', visible: false },
      ]);
    });

    it('errors for an unknown environment', async () => {
      const res = await graphql(app, {
        token,
        query: 'mutation ($data: CreatSegment!) { createSegment(data: $data) { id } }',
        variables: {
          data: {
            name: 'No env',
            environmentId: 'does-not-exist',
            bizType: 'USER',
            dataType: 'MANUAL',
          },
        },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── updateSegment ────────────────────────────────────────────────────────

  describe('updateSegment', () => {
    it('updates the name and persists it', async () => {
      const seg = await buildSegment(prisma, { projectId, environmentId, bizType: 1, dataType: 3 });
      const res = await graphql(app, {
        token,
        query: `mutation ($data: UpdateSegment!) {
          updateSegment(data: $data) { id name }
        }`,
        variables: { data: { id: seg.id, name: 'Renamed segment' } },
      });
      expect(gqlData(res).updateSegment).toMatchObject({ id: seg.id, name: 'Renamed segment' });

      const row = await prisma.segment.findUnique({ where: { id: seg.id } });
      expect(row?.name).toBe('Renamed segment');
    });

    it('updates the data filter and persists it', async () => {
      const seg = await buildSegment(prisma, { projectId, environmentId, bizType: 1, dataType: 2 });
      const data = { logic: 'and', subConditions: [] };
      const res = await graphql(app, {
        token,
        query: `mutation ($data: UpdateSegment!) {
          updateSegment(data: $data) { id data }
        }`,
        variables: { data: { id: seg.id, data } },
      });
      expect(gqlData(res).updateSegment.data).toEqual(data);

      const row = await prisma.segment.findUnique({ where: { id: seg.id } });
      expect(row?.data).toEqual(data);
    });

    it('errors updating an unknown segment', async () => {
      const res = await graphql(app, {
        token,
        query: 'mutation ($data: UpdateSegment!) { updateSegment(data: $data) { id } }',
        variables: { data: { id: 'does-not-exist', name: 'x' } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── deleteSegment ────────────────────────────────────────────────────────

  describe('deleteSegment', () => {
    it('deletes a segment and its join rows', async () => {
      const seg = await buildSegment(prisma, { projectId, environmentId, bizType: 1, dataType: 3 });
      const bizUser = await buildBizUser(prisma, { environmentId });
      await prisma.bizUserOnSegment.create({
        data: { segmentId: seg.id, bizUserId: bizUser.id, data: {} },
      });

      const res = await graphql(app, {
        token,
        query: 'mutation ($data: DeleteSegment!) { deleteSegment(data: $data) { success } }',
        variables: { data: { id: seg.id } },
      });
      expect(gqlData(res).deleteSegment).toMatchObject({ success: true });

      const [row, joins] = await Promise.all([
        prisma.segment.findUnique({ where: { id: seg.id } }),
        prisma.bizUserOnSegment.count({ where: { segmentId: seg.id } }),
      ]);
      expect(row).toBeNull();
      expect(joins).toBe(0);
    });

    it('errors deleting an unknown segment', async () => {
      const res = await graphql(app, {
        token,
        query: 'mutation ($data: DeleteSegment!) { deleteSegment(data: $data) { success } }',
        variables: { data: { id: 'does-not-exist' } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── listSegment ──────────────────────────────────────────────────────────

  describe('listSegment', () => {
    it('lists segments for the environment project', async () => {
      const seg = await buildSegment(prisma, { projectId, environmentId, bizType: 1, dataType: 3 });
      const res = await graphql(app, {
        token,
        query: `query ($environmentId: String!) {
          listSegment(environmentId: $environmentId) { id name bizType dataType columns }
        }`,
        variables: { environmentId },
      });
      const ids = gqlData(res).listSegment.map((s: { id: string }) => s.id);
      expect(ids).toContain(seg.id);
    });

    it('errors for an unknown environment', async () => {
      const res = await graphql(app, {
        token,
        query:
          'query ($environmentId: String!) { listSegment(environmentId: $environmentId) { id } }',
        variables: { environmentId: 'does-not-exist' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── createBizUserOnSegment ───────────────────────────────────────────────

  describe('createBizUserOnSegment', () => {
    it('adds biz users to a manual segment and persists the join rows', async () => {
      const seg = await buildSegment(prisma, { projectId, environmentId, bizType: 1, dataType: 3 });
      const userA = await buildBizUser(prisma, { environmentId });
      const userB = await buildBizUser(prisma, { environmentId });

      const res = await graphql(app, {
        token,
        query: `mutation ($data: CreateBizUserOnSegment!) {
          createBizUserOnSegment(data: $data) { success count }
        }`,
        variables: {
          data: {
            userOnSegment: [
              { segmentId: seg.id, bizUserId: userA.id, data: {} },
              { segmentId: seg.id, bizUserId: userB.id, data: {} },
            ],
          },
        },
      });
      expect(gqlData(res).createBizUserOnSegment).toEqual({ success: true, count: 2 });

      const joins = await prisma.bizUserOnSegment.findMany({ where: { segmentId: seg.id } });
      expect(joins.map((j) => j.bizUserId).sort()).toEqual([userA.id, userB.id].sort());
    });

    it('errors when the segment does not exist', async () => {
      const user = await buildBizUser(prisma, { environmentId });
      // Scope is derived from the segment id; an unknown segment yields no
      // resolvable project, so the guard rejects before the service runs.
      const res = await graphql(app, {
        token,
        query: `mutation ($data: CreateBizUserOnSegment!) {
          createBizUserOnSegment(data: $data) { success count }
        }`,
        variables: {
          data: {
            userOnSegment: [{ segmentId: 'does-not-exist', bizUserId: user.id, data: {} }],
          },
        },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── deleteBizUserOnSegment ───────────────────────────────────────────────

  describe('deleteBizUserOnSegment', () => {
    it('removes biz users from a segment and deletes the join rows', async () => {
      const seg = await buildSegment(prisma, { projectId, environmentId, bizType: 1, dataType: 3 });
      const userA = await buildBizUser(prisma, { environmentId });
      const userB = await buildBizUser(prisma, { environmentId });
      await prisma.bizUserOnSegment.createMany({
        data: [
          { segmentId: seg.id, bizUserId: userA.id, data: {} },
          { segmentId: seg.id, bizUserId: userB.id, data: {} },
        ],
      });

      const res = await graphql(app, {
        token,
        query: `mutation ($data: DeleteBizUserOnSegment!) {
          deleteBizUserOnSegment(data: $data) { success count }
        }`,
        variables: { data: { segmentId: seg.id, bizUserIds: [userA.id] } },
      });
      expect(gqlData(res).deleteBizUserOnSegment).toEqual({ success: true, count: 1 });

      const remaining = await prisma.bizUserOnSegment.findMany({ where: { segmentId: seg.id } });
      expect(remaining.map((j) => j.bizUserId)).toEqual([userB.id]);
    });

    it('reports zero removed when no join rows match', async () => {
      const seg = await buildSegment(prisma, { projectId, environmentId, bizType: 1, dataType: 3 });
      const user = await buildBizUser(prisma, { environmentId });
      const res = await graphql(app, {
        token,
        query: `mutation ($data: DeleteBizUserOnSegment!) {
          deleteBizUserOnSegment(data: $data) { success count }
        }`,
        variables: { data: { segmentId: seg.id, bizUserIds: [user.id] } },
      });
      expect(gqlData(res).deleteBizUserOnSegment).toEqual({ success: false, count: 0 });
    });
  });

  // ── createBizCompanyOnSegment ────────────────────────────────────────────

  describe('createBizCompanyOnSegment', () => {
    it('adds biz companies to a manual segment and persists the join rows', async () => {
      const seg = await buildSegment(prisma, { projectId, environmentId, bizType: 2, dataType: 3 });
      const companyA = await buildBizCompany(prisma, { environmentId });
      const companyB = await buildBizCompany(prisma, { environmentId });

      const res = await graphql(app, {
        token,
        query: `mutation ($data: CreateBizCompanyOnSegment!) {
          createBizCompanyOnSegment(data: $data) { success count }
        }`,
        variables: {
          data: {
            companyOnSegment: [
              { segmentId: seg.id, bizCompanyId: companyA.id, data: {} },
              { segmentId: seg.id, bizCompanyId: companyB.id, data: {} },
            ],
          },
        },
      });
      expect(gqlData(res).createBizCompanyOnSegment).toEqual({ success: true, count: 2 });

      const joins = await prisma.bizCompanyOnSegment.findMany({ where: { segmentId: seg.id } });
      expect(joins.map((j) => j.bizCompanyId).sort()).toEqual([companyA.id, companyB.id].sort());
    });

    it('errors when the segment does not exist', async () => {
      const company = await buildBizCompany(prisma, { environmentId });
      const res = await graphql(app, {
        token,
        query: `mutation ($data: CreateBizCompanyOnSegment!) {
          createBizCompanyOnSegment(data: $data) { success count }
        }`,
        variables: {
          data: {
            companyOnSegment: [{ segmentId: 'does-not-exist', bizCompanyId: company.id, data: {} }],
          },
        },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── deleteBizCompanyOnSegment ────────────────────────────────────────────

  describe('deleteBizCompanyOnSegment', () => {
    it('removes biz companies from a segment and deletes the join rows', async () => {
      const seg = await buildSegment(prisma, { projectId, environmentId, bizType: 2, dataType: 3 });
      const companyA = await buildBizCompany(prisma, { environmentId });
      const companyB = await buildBizCompany(prisma, { environmentId });
      await prisma.bizCompanyOnSegment.createMany({
        data: [
          { segmentId: seg.id, bizCompanyId: companyA.id, data: {} },
          { segmentId: seg.id, bizCompanyId: companyB.id, data: {} },
        ],
      });

      const res = await graphql(app, {
        token,
        query: `mutation ($data: DeleteBizCompanyOnSegment!) {
          deleteBizCompanyOnSegment(data: $data) { success count }
        }`,
        variables: { data: { segmentId: seg.id, bizCompanyIds: [companyA.id] } },
      });
      expect(gqlData(res).deleteBizCompanyOnSegment).toEqual({ success: true, count: 1 });

      const remaining = await prisma.bizCompanyOnSegment.findMany({ where: { segmentId: seg.id } });
      expect(remaining.map((j) => j.bizCompanyId)).toEqual([companyB.id]);
    });

    it('reports zero removed when no join rows match', async () => {
      const seg = await buildSegment(prisma, { projectId, environmentId, bizType: 2, dataType: 3 });
      const company = await buildBizCompany(prisma, { environmentId });
      const res = await graphql(app, {
        token,
        query: `mutation ($data: DeleteBizCompanyOnSegment!) {
          deleteBizCompanyOnSegment(data: $data) { success count }
        }`,
        variables: { data: { segmentId: seg.id, bizCompanyIds: [company.id] } },
      });
      expect(gqlData(res).deleteBizCompanyOnSegment).toEqual({ success: false, count: 0 });
    });
  });

  // ── deleteBizUser ────────────────────────────────────────────────────────

  describe('deleteBizUser', () => {
    it('deletes biz users (and their relations) and removes the rows', async () => {
      const userA = await buildBizUser(prisma, { environmentId });
      const userB = await buildBizUser(prisma, { environmentId });
      // Seed dependent rows so the cascading delete transaction is exercised.
      const company = await buildBizCompany(prisma, { environmentId });
      await buildBizUserOnCompany(prisma, { bizUserId: userA.id, bizCompanyId: company.id });
      const seg = await buildSegment(prisma, { projectId, environmentId, bizType: 1, dataType: 3 });
      await prisma.bizUserOnSegment.create({
        data: { segmentId: seg.id, bizUserId: userA.id, data: {} },
      });
      const event = await buildEvent(prisma, { projectId, codeName: 'to_be_deleted' });
      await prisma.bizEvent.create({ data: { eventId: event.id, bizUserId: userA.id, data: {} } });

      const res = await graphql(app, {
        token,
        query: `mutation ($data: BizUserOrCompanyIdsInput!) {
          deleteBizUser(data: $data) { success count }
        }`,
        variables: { data: { ids: [userA.id, userB.id], environmentId } },
      });
      expect(gqlData(res).deleteBizUser).toEqual({ success: true, count: 2 });

      const remaining = await prisma.bizUser.findMany({
        where: { id: { in: [userA.id, userB.id] } },
      });
      expect(remaining).toEqual([]);
      // Dependent rows were removed by the transaction.
      expect(await prisma.bizUserOnCompany.count({ where: { bizUserId: userA.id } })).toBe(0);
      expect(await prisma.bizUserOnSegment.count({ where: { bizUserId: userA.id } })).toBe(0);
      expect(await prisma.bizEvent.count({ where: { bizUserId: userA.id } })).toBe(0);
    });

    it('errors when no matching users exist', async () => {
      const res = await graphql(app, {
        token,
        query: `mutation ($data: BizUserOrCompanyIdsInput!) {
          deleteBizUser(data: $data) { success count }
        }`,
        variables: { data: { ids: ['does-not-exist'], environmentId } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });

    it('does not delete users from another environment', async () => {
      const otherEnv = await buildEnvironment(prisma, { projectId });
      const stranger = await buildBizUser(prisma, { environmentId: otherEnv.id });
      const res = await graphql(app, {
        token,
        query: `mutation ($data: BizUserOrCompanyIdsInput!) {
          deleteBizUser(data: $data) { success count }
        }`,
        variables: { data: { ids: [stranger.id], environmentId } },
      });
      // No row matches `{ id, environmentId }`, so the service throws.
      expect(res.body.errors?.length).toBeGreaterThan(0);
      const row = await prisma.bizUser.findUnique({ where: { id: stranger.id } });
      expect(row).not.toBeNull();
    });
  });

  // ── deleteBizCompany ─────────────────────────────────────────────────────

  describe('deleteBizCompany', () => {
    it('deletes biz companies (and their relations) and removes the rows', async () => {
      const companyA = await buildBizCompany(prisma, { environmentId });
      const companyB = await buildBizCompany(prisma, { environmentId });
      const user = await buildBizUser(prisma, { environmentId });
      await buildBizUserOnCompany(prisma, { bizUserId: user.id, bizCompanyId: companyA.id });
      const seg = await buildSegment(prisma, { projectId, environmentId, bizType: 2, dataType: 3 });
      await prisma.bizCompanyOnSegment.create({
        data: { segmentId: seg.id, bizCompanyId: companyA.id, data: {} },
      });

      const res = await graphql(app, {
        token,
        query: `mutation ($data: BizUserOrCompanyIdsInput!) {
          deleteBizCompany(data: $data) { success count }
        }`,
        variables: { data: { ids: [companyA.id, companyB.id], environmentId } },
      });
      expect(gqlData(res).deleteBizCompany).toEqual({ success: true, count: 2 });

      const remaining = await prisma.bizCompany.findMany({
        where: { id: { in: [companyA.id, companyB.id] } },
      });
      expect(remaining).toEqual([]);
      expect(await prisma.bizUserOnCompany.count({ where: { bizCompanyId: companyA.id } })).toBe(0);
      expect(await prisma.bizCompanyOnSegment.count({ where: { bizCompanyId: companyA.id } })).toBe(
        0,
      );
    });

    it('reports zero deleted for an unknown company', async () => {
      const res = await graphql(app, {
        token,
        query: `mutation ($data: BizUserOrCompanyIdsInput!) {
          deleteBizCompany(data: $data) { success count }
        }`,
        variables: { data: { ids: ['does-not-exist'], environmentId } },
      });
      expect(gqlData(res).deleteBizCompany).toEqual({ success: false, count: 0 });
    });

    it('does not delete companies from another environment', async () => {
      const otherEnv = await buildEnvironment(prisma, { projectId });
      const stranger = await buildBizCompany(prisma, { environmentId: otherEnv.id });
      const res = await graphql(app, {
        token,
        query: `mutation ($data: BizUserOrCompanyIdsInput!) {
          deleteBizCompany(data: $data) { success count }
        }`,
        variables: { data: { ids: [stranger.id], environmentId } },
      });
      // The delete is scoped to `environmentId`, so nothing matches.
      expect(gqlData(res).deleteBizCompany).toEqual({ success: false, count: 0 });
      const row = await prisma.bizCompany.findUnique({ where: { id: stranger.id } });
      expect(row).not.toBeNull();
    });
  });
});
