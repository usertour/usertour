import { INestApplication } from '@nestjs/common';
import { BizEvents, Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import {
  buildBizUser,
  buildContent,
  buildEnvironment,
  buildEvent,
  buildProject,
  buildSession,
  buildVersion,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/**
 * Pins the PER-TYPE counting semantics of /analytics — the one-sentence
 * definition each field's describe promises, verified through the real SQL:
 *
 * - resource-center `total*` counts EVENTS (repeats included): an RC session is
 *   lifetime-long, so the old session-distinct totals always equaled `unique*`
 *   and contradicted the per-block rows (live: headline 53 vs blocks-sum 81).
 *   Headline totalClicks must reconcile with the block rows, which carry tabId.
 * - launcher metrics are FIRST-TOUCH: seen fires once per user (at first
 *   display), and `newActivations` counts users whose first-EVER activation
 *   fell in the range — a user reached before the range stays invisible in it
 *   no matter how active they still are. No `total*` fields exist.
 * - banner exposes only the two first-touch user counts; announcement only
 *   uniqueSeen. The session totals the domain still computes for them repeat
 *   the unique numbers and must NOT appear in the payload.
 */
describe('API v2 analytics per-type counting semantics (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectId: string;
  let environmentId: string;
  let apiToken: string;

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  function rest(path: string) {
    return request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${apiToken}`);
  }
  const analyticsUrl = (contentId: string, extra = '') =>
    `/v2/projects/${projectId}/content/${contentId}/analytics?environmentId=${environmentId}${extra}`;

  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
  const isoDay = (d: Date) => d.toISOString().slice(0, 10);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'analytics-semantics' })).id;
    environmentId = (await buildEnvironment(prisma, { projectId, isPrimary: true })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;

    const minted = await graphql(app, {
      query: CREATE,
      variables: {
        input: {
          name: 'analytics-semantics',
          scopes: [Capability.AnalyticsRead],
          projectIds: [projectId],
          environmentIds: [environmentId],
        },
      },
      token: ownerToken,
    });
    apiToken = gqlData(minted).createApiToken.token;
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.apiToken.deleteMany({ where: { userId: ownerUserId } });
      await teardownProject(prisma, projectId);
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
    }
    await app?.close();
  });

  it('resource-center: totals count events, reconcile with block rows, and byDay sums to the headline', async () => {
    const openedDef = await buildEvent(prisma, {
      projectId,
      codeName: BizEvents.RESOURCE_CENTER_OPENED,
    });
    const clickedDef = await buildEvent(prisma, {
      projectId,
      codeName: BizEvents.RESOURCE_CENTER_CLICKED,
    });
    const rc = await buildContent(prisma, {
      projectId,
      environmentId,
      type: 'resource-center',
      name: 'Help center',
    });
    const versionId = (
      await buildVersion(prisma, {
        contentId: rc.id,
        sequence: 0,
        data: {
          tabs: [
            {
              id: 'tab1',
              name: 'Home',
              blocks: [
                { id: 'b1', name: 'Docs', type: 'action' },
                // Display-only: must produce NO analytics row.
                { id: 'rt1', name: 'Intro', type: 'richtext' },
              ],
            },
          ],
        } as unknown as object,
      })
    ).id;

    // An RC session is lifetime-long: the repeat user's 3 opens + 3 clicks live
    // in ONE session — exactly the shape the old session-distinct totals
    // collapsed to 1.
    const repeatUser = await buildBizUser(prisma, { environmentId });
    const onceUser = await buildBizUser(prisma, { environmentId });
    const mkSession = (bizUserId: string) =>
      buildSession(prisma, { bizUserId, contentId: rc.id, versionId, environmentId, projectId });
    const s1 = await mkSession(repeatUser.id);
    const s2 = await mkSession(onceUser.id);

    const ev = (
      session: { id: string },
      user: { id: string },
      eventId: string,
      data: object = {},
    ) => ({ bizSessionId: session.id, bizUserId: user.id, eventId, data });
    const click = { resource_center_block_id: 'b1' };
    await prisma.bizEvent.createMany({
      data: [
        ev(s1, repeatUser, openedDef.id),
        ev(s1, repeatUser, openedDef.id),
        ev(s1, repeatUser, openedDef.id),
        ev(s2, onceUser, openedDef.id),
        ev(s1, repeatUser, clickedDef.id, click),
        ev(s1, repeatUser, clickedDef.id, click),
        ev(s1, repeatUser, clickedDef.id, click),
        ev(s2, onceUser, clickedDef.id, click),
      ],
    });

    const res = await rest(analyticsUrl(rc.id));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      contentType: 'resource-center',
      uniqueOpens: 2,
      totalOpens: 4, // events — the old session-distinct rule reported 2 here
      uniqueClicks: 2,
      totalClicks: 4,
    });

    // Block rows carry tabId, skip display-only blocks, and reconcile with the
    // headline: totalClicks === Σ blocks.totalClicks.
    expect(res.body.blocks).toEqual([
      {
        name: 'Docs',
        blockId: 'b1',
        tabId: 'tab1',
        tabName: 'Home',
        uniqueClicks: 2,
        totalClicks: 4,
      },
    ]);
    const blockSum = (res.body.blocks as Array<{ totalClicks: number }>).reduce(
      (sum, b) => sum + b.totalClicks,
      0,
    );
    expect(res.body.totalClicks).toBe(blockSum);

    // byDay total rows are per-day event increments summing to the headline.
    const byDay = res.body.byDay as Array<{ totalOpens: number; totalClicks: number }>;
    expect(byDay.reduce((sum, d) => sum + d.totalOpens, 0)).toBe(4);
    expect(byDay.reduce((sum, d) => sum + d.totalClicks, 0)).toBe(4);
  });

  it('launcher: first-touch semantics — a user reached before the range is invisible in it; no totals', async () => {
    const seenDef = await buildEvent(prisma, { projectId, codeName: BizEvents.LAUNCHER_SEEN });
    const activatedDef = await buildEvent(prisma, {
      projectId,
      codeName: BizEvents.LAUNCHER_ACTIVATED,
    });
    const launcher = await buildContent(prisma, {
      projectId,
      environmentId,
      type: 'launcher',
      name: 'Beacon',
    });
    const versionId = (await buildVersion(prisma, { contentId: launcher.id, sequence: 0 })).id;

    // oldUser: first reached AND first activated 40 days ago, still active
    // 5 days ago (activation events repeat — nothing dedups them at write).
    // newUser: first reached + twice activated 5 days ago.
    const oldUser = await buildBizUser(prisma, { environmentId });
    const newUser = await buildBizUser(prisma, { environmentId });
    const mkSession = (bizUserId: string) =>
      buildSession(prisma, {
        bizUserId,
        contentId: launcher.id,
        versionId,
        environmentId,
        projectId,
      });
    const oldS = await mkSession(oldUser.id);
    const newS = await mkSession(newUser.id);

    const ev = (
      session: { id: string },
      user: { id: string },
      eventId: string,
      createdAt: Date,
    ) => ({ bizSessionId: session.id, bizUserId: user.id, eventId, data: {}, createdAt });
    await prisma.bizEvent.createMany({
      data: [
        ev(oldS, oldUser, seenDef.id, daysAgo(40)),
        ev(oldS, oldUser, activatedDef.id, daysAgo(40)),
        ev(oldS, oldUser, activatedDef.id, daysAgo(5)), // repeat activity in range
        ev(newS, newUser, seenDef.id, daysAgo(5)),
        ev(newS, newUser, activatedDef.id, daysAgo(5)),
        ev(newS, newUser, activatedDef.id, daysAgo(5)),
      ],
    });

    // Default range (last 30 days): only newUser counts. oldUser's in-range
    // activation does NOT resurface them — first-touch, not window activity.
    const recent = await rest(analyticsUrl(launcher.id));
    expect(recent.status).toBe(200);
    expect(recent.body).toMatchObject({
      contentType: 'launcher',
      uniqueSeen: 1,
      newActivations: 1,
    });
    expect(recent.body).not.toHaveProperty('totalSeen');
    expect(recent.body).not.toHaveProperty('totalActivations');
    expect(recent.body).not.toHaveProperty('uniqueActivations');
    // byDay rows are first-touch too — summing equals the range headline.
    const byDay = recent.body.byDay as Array<{ uniqueSeen: number; newActivations: number }>;
    expect(byDay.reduce((sum, d) => sum + d.uniqueSeen, 0)).toBe(1);
    expect(byDay.reduce((sum, d) => sum + d.newActivations, 0)).toBe(1);

    // All-time range: both users, once each — repeats never add.
    const allTime = await rest(analyticsUrl(launcher.id, `&startDate=${isoDay(daysAgo(60))}`));
    expect(allTime.body).toMatchObject({ uniqueSeen: 2, newActivations: 2 });
  });

  it('banner: only the two first-touch user counts — no fake totals', async () => {
    const seenDef = await buildEvent(prisma, { projectId, codeName: BizEvents.BANNER_SEEN });
    const dismissedDef = await buildEvent(prisma, {
      projectId,
      codeName: BizEvents.BANNER_DISMISSED,
    });
    const banner = await buildContent(prisma, {
      projectId,
      environmentId,
      type: 'banner',
      name: 'Notice',
    });
    const versionId = (await buildVersion(prisma, { contentId: banner.id, sequence: 0 })).id;
    const user = await buildBizUser(prisma, { environmentId });
    const session = await buildSession(prisma, {
      bizUserId: user.id,
      contentId: banner.id,
      versionId,
      environmentId,
      projectId,
    });
    await prisma.bizEvent.createMany({
      data: [
        { bizSessionId: session.id, bizUserId: user.id, eventId: seenDef.id, data: {} },
        { bizSessionId: session.id, bizUserId: user.id, eventId: dismissedDef.id, data: {} },
      ],
    });

    const res = await rest(analyticsUrl(banner.id));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      contentType: 'banner',
      uniqueSeen: 1,
      uniqueDismissals: 1,
    });
    expect(res.body).not.toHaveProperty('totalSeen');
    expect(res.body).not.toHaveProperty('totalDismissals');
  });

  it('announcement: uniqueSeen only — first-seen-only writes make an event total redundant', async () => {
    await buildEvent(prisma, { projectId, codeName: BizEvents.ANNOUNCEMENT_SEEN });
    const announcement = await buildContent(prisma, {
      projectId,
      environmentId,
      type: 'announcement',
      name: 'Release note',
    });
    // Announcements create no sessions; their events ride bizEvent.contentId.
    const seenDef = await prisma.event.findFirstOrThrow({
      where: { projectId, codeName: BizEvents.ANNOUNCEMENT_SEEN },
    });
    const u1 = await buildBizUser(prisma, { environmentId });
    const u2 = await buildBizUser(prisma, { environmentId });
    await prisma.bizEvent.createMany({
      data: [u1, u2].map((u) => ({
        bizUserId: u.id,
        eventId: seenDef.id,
        contentId: announcement.id,
        data: {},
      })),
    });

    const res = await rest(analyticsUrl(announcement.id));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ contentType: 'announcement', uniqueSeen: 2 });
    expect(res.body).not.toHaveProperty('totalSeen');
    const byDay = res.body.byDay as Array<{ uniqueSeen: number }>;
    expect(byDay.reduce((sum, d) => sum + d.uniqueSeen, 0)).toBe(2);
  });
});
