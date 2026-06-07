import { INestApplication } from '@nestjs/common';
import { BizEvents } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import { graphql, gqlData } from '../auth';
import { createTestApp } from '../create-test-app';
import {
  buildBizUser,
  buildContent,
  buildEnvironment,
  buildProject,
  buildSession,
  buildStep,
  buildVersion,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';
import { initialization } from '@/common/initialization/initialization';

/**
 * Functional e2e for the `analytics` GraphQL resolver — follows the themes
 * template: run as an authorized OWNER, assert each mutation's effect in the DB
 * (not just the response), cover key read/error cases. Auth (who-can-call) is
 * already covered by permission.e2e-spec; here we run as OWNER.
 *
 * Analytics is intricate (sessions / events / answers). Setup notes:
 *  - `initialization(prisma, projectId)` seeds the default Event definitions
 *    (FLOW_STARTED / FLOW_STEP_SEEN / FLOW_ENDED / FLOW_COMPLETED / …) + their
 *    attributes. `endSession` and the aggregation queries dereference those, so
 *    a "realistic" project is required. teardownProject deletes them by project.
 *  - Sessions are seeded with `buildSession`, all wired to the same FLOW content
 *    / version / environment. Most analytics queries take an `AnalyticsQuery`
 *    (contentId, environmentId, startDate, endDate, timezone) + relay pagination
 *    (first/after) + a required `orderBy`. A wide date window keeps seeded
 *    sessions inside the range.
 *  - Aggregation queries (queryContentAnalytics, queryContentQuestionAnalytics,
 *    queryTooltipTargetMissingSessions, queryTrackerUsers) are complex; we assert
 *    the response SHAPE is well-formed (fields present, numbers/arrays) and that
 *    the query executes against seeded data, rather than exact aggregate values.
 *  - The permission guard derives the project from contentId / environmentId /
 *    sessionId. So an op pointed at a non-existent resource fails at the GUARD
 *    (NoPermissionError) — that's still an error response, which the error cases
 *    assert via `res.body.errors`.
 */
describe('GraphQL analytics (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let contentId: string;
  let versionId: string;
  let bizUserId: string;
  let stepCvid: string;
  let token: string;
  const userIds: string[] = [];

  // A wide window so every seeded session (created "now") falls inside.
  const startDate = '2000-01-01T00:00:00.000Z';
  const endDate = '2100-01-01T00:00:00.000Z';
  const timezone = 'UTC';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'gql-analytics' });
    projectId = project.id;
    // Seed default event/attribute definitions (FLOW_*, TOOLTIP_TARGET_MISSING, …).
    await initialization(prisma, projectId);

    const environment = await buildEnvironment(prisma, { projectId, isPrimary: true });
    environmentId = environment.id;

    // A FLOW content + version + step, all under the same project/environment.
    const content = await buildContent(prisma, {
      projectId,
      environmentId,
      type: 'flow',
      name: 'Onboarding flow',
    });
    contentId = content.id;
    const version = await buildVersion(prisma, { contentId });
    versionId = version.id;
    stepCvid = `step-cvid-${Date.now()}`;
    await buildStep(prisma, {
      versionId,
      type: 'tooltip',
      name: 'Step 1',
      sequence: 0,
      cvid: stepCvid,
    });

    const bizUser = await buildBizUser(prisma, { environmentId });
    bizUserId = bizUser.id;

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

  // Seed a BizSession (with at least one BizEvent, so the `bizEvent: { some: {} }`
  // filter in queryRecentSessions includes it) for the shared FLOW content.
  const seedSession = async (overrides: { state?: number } = {}) => {
    const session = await buildSession(prisma, {
      bizUserId,
      contentId,
      versionId,
      environmentId,
      projectId,
      ...overrides,
    });
    const startedEvent = await prisma.event.findFirstOrThrow({
      where: { projectId, codeName: BizEvents.FLOW_STARTED },
    });
    await prisma.bizEvent.create({
      data: {
        bizSessionId: session.id,
        eventId: startedEvent.id,
        bizUserId,
        data: {},
      },
    });
    return session;
  };

  // ── queryContentAnalytics ──────────────────────────────────────────────────

  describe('queryContentAnalytics', () => {
    it('returns a well-formed analytics aggregate for seeded sessions', async () => {
      await seedSession();
      const res = await graphql(app, {
        token,
        query: `query ($contentId: String!, $startDate: String!, $endDate: String!, $timezone: String!, $environmentId: String!) {
          queryContentAnalytics(
            contentId: $contentId
            startDate: $startDate
            endDate: $endDate
            timezone: $timezone
            environmentId: $environmentId
          ) {
            uniqueViews
            totalViews
            uniqueCompletions
            totalCompletions
            viewsByDay
            viewsByStep
          }
        }`,
        variables: { contentId, startDate, endDate, timezone, environmentId },
      });
      const analytics = gqlData(res).queryContentAnalytics;
      expect(typeof analytics.uniqueViews).toBe('number');
      expect(typeof analytics.totalViews).toBe('number');
      expect(typeof analytics.uniqueCompletions).toBe('number');
      expect(typeof analytics.totalCompletions).toBe('number');
      // FLOW content produces a per-step breakdown array.
      expect(Array.isArray(analytics.viewsByStep)).toBe(true);
      // At least one FLOW_STARTED event was seeded, so views are counted.
      expect(analytics.totalViews).toBeGreaterThanOrEqual(1);
    });

    it('errors for an unknown content (Content-scoped guard cannot resolve scope)', async () => {
      // This op is Content-scoped: the guard resolves the project from the
      // contentId. An unknown contentId yields no project, so the guard rejects
      // before the service's empty-analytics branch is reached.
      const res = await graphql(app, {
        token,
        query: `query ($contentId: String!, $startDate: String!, $endDate: String!, $timezone: String!, $environmentId: String!) {
          queryContentAnalytics(
            contentId: $contentId
            startDate: $startDate
            endDate: $endDate
            timezone: $timezone
            environmentId: $environmentId
          ) {
            uniqueViews
          }
        }`,
        variables: {
          contentId: 'does-not-exist',
          startDate,
          endDate,
          timezone,
          environmentId,
        },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── queryContentQuestionAnalytics ──────────────────────────────────────────

  describe('queryContentQuestionAnalytics', () => {
    it('executes against the seeded flow and returns a JSON result', async () => {
      const res = await graphql(app, {
        token,
        query: `query ($contentId: String!, $startDate: String!, $endDate: String!, $timezone: String!, $environmentId: String!) {
          queryContentQuestionAnalytics(
            contentId: $contentId
            startDate: $startDate
            endDate: $endDate
            timezone: $timezone
            environmentId: $environmentId
          )
        }`,
        variables: { contentId, startDate, endDate, timezone, environmentId },
      });
      const result = gqlData(res).queryContentQuestionAnalytics;
      // The seeded step carries no question, so the per-step loop yields []. The
      // contract is "an array of question analytics" — assert that shape.
      expect(Array.isArray(result)).toBe(true);
    });

    it('errors for an unknown content (Content-scoped guard cannot resolve scope)', async () => {
      // Content-scoped: an unknown contentId resolves to no project, so the guard
      // rejects before the service's `return false` branch is reached.
      const res = await graphql(app, {
        token,
        query: `query ($contentId: String!, $startDate: String!, $endDate: String!, $timezone: String!, $environmentId: String!) {
          queryContentQuestionAnalytics(
            contentId: $contentId
            startDate: $startDate
            endDate: $endDate
            timezone: $timezone
            environmentId: $environmentId
          )
        }`,
        variables: {
          contentId: 'does-not-exist',
          startDate,
          endDate,
          timezone,
          environmentId,
        },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── queryBizSession ────────────────────────────────────────────────────────

  describe('queryBizSession', () => {
    it('returns seeded sessions for the content, paginated', async () => {
      const session = await seedSession();
      const res = await graphql(app, {
        token,
        query: `query ($query: AnalyticsQuery!, $orderBy: AnalyticsOrder!, $first: Int) {
          queryBizSession(query: $query, orderBy: $orderBy, first: $first) {
            totalCount
            pageInfo { hasNextPage }
            edges { node { id contentId state bizUser { id } content { id } } }
          }
        }`,
        variables: {
          query: { contentId, environmentId, startDate, endDate, timezone },
          orderBy: { field: 'createdAt', direction: 'desc' },
          first: 50,
        },
      });
      const conn = gqlData(res).queryBizSession;
      const ids = conn.edges.map((e: { node: { id: string } }) => e.node.id);
      expect(ids).toContain(session.id);
      expect(conn.totalCount).toBeGreaterThanOrEqual(1);
      const node = conn.edges.find((e: { node: { id: string } }) => e.node.id === session.id).node;
      expect(node.contentId).toBe(contentId);
      expect(node.content.id).toBe(contentId);
      expect(node.bizUser.id).toBe(bizUserId);
    });

    it('respects the first/after pagination cursor', async () => {
      // Two sessions guarantees a second page when first=1.
      await seedSession();
      await seedSession();
      const firstPage = gqlData(
        await graphql(app, {
          token,
          query: `query ($query: AnalyticsQuery!, $orderBy: AnalyticsOrder!, $first: Int) {
            queryBizSession(query: $query, orderBy: $orderBy, first: $first) {
              totalCount
              pageInfo { hasNextPage endCursor }
              edges { node { id } cursor }
            }
          }`,
          variables: {
            query: { contentId, environmentId, startDate, endDate, timezone },
            orderBy: { field: 'createdAt', direction: 'desc' },
            first: 1,
          },
        }),
      ).queryBizSession;
      expect(firstPage.edges).toHaveLength(1);
      expect(firstPage.totalCount).toBeGreaterThanOrEqual(2);
      expect(firstPage.pageInfo.hasNextPage).toBe(true);

      const secondPage = gqlData(
        await graphql(app, {
          token,
          query: `query ($query: AnalyticsQuery!, $orderBy: AnalyticsOrder!, $first: Int, $after: String) {
            queryBizSession(query: $query, orderBy: $orderBy, first: $first, after: $after) {
              edges { node { id } }
            }
          }`,
          variables: {
            query: { contentId, environmentId, startDate, endDate, timezone },
            orderBy: { field: 'createdAt', direction: 'desc' },
            first: 1,
            after: firstPage.pageInfo.endCursor,
          },
        }),
      ).queryBizSession;
      expect(secondPage.edges).toHaveLength(1);
      // The second page is a different session than the first.
      expect(secondPage.edges[0].node.id).not.toBe(firstPage.edges[0].node.id);
    });
  });

  // ── querySessionDetail ─────────────────────────────────────────────────────

  describe('querySessionDetail', () => {
    it('returns the seeded session with its relations', async () => {
      const session = await seedSession();
      const res = await graphql(app, {
        token,
        query: `query ($sessionId: String!) {
          querySessionDetail(sessionId: $sessionId) {
            id
            contentId
            bizUserId
            bizUser { id }
            content { id }
            bizEvent { id eventId }
          }
        }`,
        variables: { sessionId: session.id },
      });
      const detail = gqlData(res).querySessionDetail;
      expect(detail.id).toBe(session.id);
      expect(detail.contentId).toBe(contentId);
      expect(detail.bizUserId).toBe(bizUserId);
      expect(detail.bizUser.id).toBe(bizUserId);
      expect(Array.isArray(detail.bizEvent)).toBe(true);
      expect(detail.bizEvent.length).toBeGreaterThanOrEqual(1);
    });

    it('returns null for a soft-deleted session (the row exists, scope resolves)', async () => {
      const session = await seedSession();
      await prisma.bizSession.update({ where: { id: session.id }, data: { deleted: true } });
      const res = await graphql(app, {
        token,
        query: 'query ($sessionId: String!) { querySessionDetail(sessionId: $sessionId) { id } }',
        variables: { sessionId: session.id },
      });
      // Service filters `deleted: false`, so it resolves to null (the field is nullable).
      expect(gqlData(res).querySessionDetail).toBeNull();
    });

    it('errors for an unknown session (guard cannot resolve scope)', async () => {
      const res = await graphql(app, {
        token,
        query: 'query ($sessionId: String!) { querySessionDetail(sessionId: $sessionId) { id } }',
        variables: { sessionId: 'does-not-exist' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── listSessionsDetail ─────────────────────────────────────────────────────

  describe('listSessionsDetail', () => {
    it('returns seeded sessions enriched with details', async () => {
      const session = await seedSession();
      const res = await graphql(app, {
        token,
        query: `query ($query: AnalyticsQuery!, $orderBy: AnalyticsOrder!, $first: Int) {
          listSessionsDetail(query: $query, orderBy: $orderBy, first: $first) {
            totalCount
            edges { node { id bizEvent { id } content { id } } }
          }
        }`,
        variables: {
          query: { contentId, environmentId, startDate, endDate, timezone },
          orderBy: { field: 'createdAt', direction: 'desc' },
          first: 50,
        },
      });
      const conn = gqlData(res).listSessionsDetail;
      const ids = conn.edges.map((e: { node: { id: string } }) => e.node.id);
      expect(ids).toContain(session.id);
      const node = conn.edges.find((e: { node: { id: string } }) => e.node.id === session.id).node;
      expect(node.content.id).toBe(contentId);
      expect(Array.isArray(node.bizEvent)).toBe(true);
    });
  });

  // ── querySessionsByExternalId ──────────────────────────────────────────────

  describe('querySessionsByExternalId', () => {
    it('returns sessions filtered by the external user id', async () => {
      const session = await seedSession();
      const bizUser = await prisma.bizUser.findUniqueOrThrow({ where: { id: bizUserId } });
      const res = await graphql(app, {
        token,
        query: `query ($query: SessionQuery!, $orderBy: AnalyticsOrder!, $first: Int) {
          querySessionsByExternalId(query: $query, orderBy: $orderBy, first: $first) {
            totalCount
            edges { node { id bizUser { externalId } } }
          }
        }`,
        variables: {
          query: { environmentId, externalUserId: bizUser.externalId, contentId },
          orderBy: { field: 'createdAt', direction: 'desc' },
          first: 50,
        },
      });
      const conn = gqlData(res).querySessionsByExternalId;
      const ids = conn.edges.map((e: { node: { id: string } }) => e.node.id);
      expect(ids).toContain(session.id);
      expect(conn.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('returns an empty connection when neither external user nor company is given', async () => {
      const res = await graphql(app, {
        token,
        query: `query ($query: SessionQuery!, $orderBy: AnalyticsOrder!, $first: Int) {
          querySessionsByExternalId(query: $query, orderBy: $orderBy, first: $first) {
            totalCount
            edges { node { id } }
          }
        }`,
        variables: {
          query: { environmentId },
          orderBy: { field: 'createdAt', direction: 'desc' },
          first: 50,
        },
      });
      const conn = gqlData(res).querySessionsByExternalId;
      expect(conn.totalCount).toBe(0);
      expect(conn.edges).toEqual([]);
    });
  });

  // ── queryTooltipTargetMissingSessions ──────────────────────────────────────

  describe('queryTooltipTargetMissingSessions', () => {
    it('returns a well-formed response (sessions + stepAnalytics) for a step', async () => {
      const res = await graphql(app, {
        token,
        query: `query ($query: TooltipTargetMissingQuery!, $orderBy: AnalyticsOrder!, $first: Int) {
          queryTooltipTargetMissingSessions(query: $query, orderBy: $orderBy, first: $first) {
            sessions {
              totalCount
              pageInfo { hasNextPage }
              edges { node { id } }
            }
            stepAnalytics {
              uniqueViews
              totalViews
              uniqueCompletions
              totalCompletions
              uniqueTooltipTargetMissingCount
              tooltipTargetMissingCount
            }
          }
        }`,
        variables: {
          query: { contentId, environmentId, startDate, endDate, timezone, stepCvid },
          orderBy: { field: 'createdAt', direction: 'desc' },
          first: 50,
        },
      });
      const result = gqlData(res).queryTooltipTargetMissingSessions;
      expect(typeof result.sessions.totalCount).toBe('number');
      expect(Array.isArray(result.sessions.edges)).toBe(true);
      const s = result.stepAnalytics;
      expect(typeof s.uniqueViews).toBe('number');
      expect(typeof s.totalViews).toBe('number');
      expect(typeof s.uniqueTooltipTargetMissingCount).toBe('number');
      expect(typeof s.tooltipTargetMissingCount).toBe('number');
    });

    it('surfaces a session that recorded a tooltip-target-missing event for the step', async () => {
      const session = await seedSession();
      const missingEvent = await prisma.event.findFirstOrThrow({
        where: { projectId, codeName: BizEvents.TOOLTIP_TARGET_MISSING },
      });
      await prisma.bizEvent.create({
        data: {
          bizSessionId: session.id,
          eventId: missingEvent.id,
          bizUserId,
          data: { flow_step_cvid: stepCvid },
        },
      });

      const res = await graphql(app, {
        token,
        query: `query ($query: TooltipTargetMissingQuery!, $orderBy: AnalyticsOrder!, $first: Int) {
          queryTooltipTargetMissingSessions(query: $query, orderBy: $orderBy, first: $first) {
            sessions { totalCount edges { node { id } } }
            stepAnalytics { tooltipTargetMissingCount }
          }
        }`,
        variables: {
          query: { contentId, environmentId, startDate, endDate, timezone, stepCvid },
          orderBy: { field: 'createdAt', direction: 'desc' },
          first: 50,
        },
      });
      const result = gqlData(res).queryTooltipTargetMissingSessions;
      const ids = result.sessions.edges.map((e: { node: { id: string } }) => e.node.id);
      expect(ids).toContain(session.id);
      expect(result.stepAnalytics.tooltipTargetMissingCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ── queryTrackerUsers ──────────────────────────────────────────────────────

  describe('queryTrackerUsers', () => {
    it('returns an empty connection when no tracker events exist for the content', async () => {
      // queryTrackerUsers counts BizEvents keyed by contentId; the flow events we
      // seed are keyed by session (no contentId on the BizEvent), so the distinct
      // tracker-user count is 0 → the documented empty connection shape.
      const res = await graphql(app, {
        token,
        query: `query ($query: AnalyticsQuery!, $orderBy: AnalyticsOrder!, $first: Int) {
          queryTrackerUsers(query: $query, orderBy: $orderBy, first: $first) {
            totalCount
            pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
            edges { node { id eventsCount } }
          }
        }`,
        variables: {
          query: { contentId, environmentId, startDate, endDate, timezone },
          orderBy: { field: 'createdAt', direction: 'desc' },
          first: 50,
        },
      });
      const conn = gqlData(res).queryTrackerUsers;
      expect(conn.totalCount).toBe(0);
      expect(conn.edges).toEqual([]);
      expect(conn.pageInfo.hasNextPage).toBe(false);
    });

    it('aggregates a tracker user from content-keyed events', async () => {
      // Seed an event carrying `contentId` directly (the tracker shape) so the
      // distinct-by-bizUser aggregation surfaces this user.
      const startedEvent = await prisma.event.findFirstOrThrow({
        where: { projectId, codeName: BizEvents.FLOW_STARTED },
      });
      await prisma.bizEvent.create({
        data: {
          contentId,
          eventId: startedEvent.id,
          bizUserId,
          data: {},
        },
      });

      const res = await graphql(app, {
        token,
        query: `query ($query: AnalyticsQuery!, $orderBy: AnalyticsOrder!, $first: Int) {
          queryTrackerUsers(query: $query, orderBy: $orderBy, first: $first) {
            totalCount
            edges { node { id bizUser { id } eventsCount firstTrackedAt lastTrackedAt } }
          }
        }`,
        variables: {
          query: { contentId, environmentId, startDate, endDate, timezone },
          orderBy: { field: 'createdAt', direction: 'desc' },
          first: 50,
        },
      });
      const conn = gqlData(res).queryTrackerUsers;
      expect(conn.totalCount).toBeGreaterThanOrEqual(1);
      const node = conn.edges.find((e: { node: { id: string } }) => e.node.id === bizUserId)?.node;
      expect(node).toBeDefined();
      expect(node.bizUser.id).toBe(bizUserId);
      expect(typeof node.eventsCount).toBe('number');
      expect(node.eventsCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ── deleteSession ──────────────────────────────────────────────────────────

  describe('deleteSession', () => {
    it('hard-deletes the session row (and its events/answers)', async () => {
      const session = await seedSession();
      // Confirm the session + its seeded event exist first.
      expect(await prisma.bizEvent.count({ where: { bizSessionId: session.id } })).toBeGreaterThan(
        0,
      );

      const res = await graphql(app, {
        token,
        query: 'mutation ($sessionId: String!) { deleteSession(sessionId: $sessionId) }',
        variables: { sessionId: session.id },
      });
      expect(gqlData(res).deleteSession).toBe(true);

      const [row, events] = await Promise.all([
        prisma.bizSession.findUnique({ where: { id: session.id } }),
        prisma.bizEvent.count({ where: { bizSessionId: session.id } }),
      ]);
      expect(row).toBeNull();
      expect(events).toBe(0);
    });

    it('errors for an unknown session (guard cannot resolve scope)', async () => {
      const res = await graphql(app, {
        token,
        query: 'mutation ($sessionId: String!) { deleteSession(sessionId: $sessionId) }',
        variables: { sessionId: 'does-not-exist' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── endSession ─────────────────────────────────────────────────────────────

  describe('endSession', () => {
    it('ends a FLOW session: writes FLOW_ENDED and flips state to 1', async () => {
      const session = await seedSession();
      // endFlowSession reads the latest FLOW_STEP_SEEN biz event for end-reason
      // context; seed one so the realistic path is exercised.
      const seenEvent = await prisma.event.findFirstOrThrow({
        where: { projectId, codeName: BizEvents.FLOW_STEP_SEEN },
      });
      await prisma.bizEvent.create({
        data: {
          bizSessionId: session.id,
          eventId: seenEvent.id,
          bizUserId,
          data: { flow_step_cvid: stepCvid, flow_step_number: 0 },
        },
      });

      const res = await graphql(app, {
        token,
        query: 'mutation ($sessionId: String!) { endSession(sessionId: $sessionId) }',
        variables: { sessionId: session.id },
      });
      expect(gqlData(res).endSession).toBe(true);

      const row = await prisma.bizSession.findUnique({ where: { id: session.id } });
      expect(row?.state).toBe(1);
      // A FLOW_ENDED biz event was recorded for the session.
      const endEvent = await prisma.event.findFirstOrThrow({
        where: { projectId, codeName: BizEvents.FLOW_ENDED },
      });
      const ended = await prisma.bizEvent.count({
        where: { bizSessionId: session.id, eventId: endEvent.id },
      });
      expect(ended).toBe(1);
    });

    it('returns false for an already-ended session (state = 1)', async () => {
      const session = await seedSession({ state: 1 });
      const res = await graphql(app, {
        token,
        query: 'mutation ($sessionId: String!) { endSession(sessionId: $sessionId) }',
        variables: { sessionId: session.id },
      });
      expect(gqlData(res).endSession).toBe(false);
    });

    it('errors for an unknown session (guard cannot resolve scope)', async () => {
      const res = await graphql(app, {
        token,
        query: 'mutation ($sessionId: String!) { endSession(sessionId: $sessionId) }',
        variables: { sessionId: 'does-not-exist' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });
});
