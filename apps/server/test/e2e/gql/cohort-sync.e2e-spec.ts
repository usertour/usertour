import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';
import { SegmentDataTypes } from '@usertour/types';

import { graphql, gqlData } from '../auth';
import { buildBizUser, buildEnvironment, buildProject, buildSubscription } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';
import { createTestApp } from '../create-test-app';

const UPSERT_INTEGRATION = `mutation ($data: UpsertIntegrationInput!) {
  upsertIntegration(data: $data) { id environmentId inboundEnabled inboundUrl }
}`;
const UPDATE_INBOUND = `mutation ($data: UpdateIntegrationInboundInput!) {
  updateIntegrationInbound(data: $data) { id inboundEnabled inboundConfig inboundUrl }
}`;
const ROTATE_INBOUND = `mutation ($data: IntegrationIdInput!) {
  rotateIntegrationInboundToken(data: $data) { id inboundUrl }
}`;
const QUERY_SYNCED = `query ($integrationId: String!) {
  queryIntegrationSyncedSegments(integrationId: $integrationId) {
    id sourceCohortId sourceCohortName segmentId segmentName memberCount unresolvedCount lastSyncedAt
  }
}`;
const DELETE_INTEGRATION =
  'mutation ($data: IntegrationIdInput!) { deleteIntegration(data: $data) { id } }';
const UPDATE_SEGMENT = 'mutation ($data: UpdateSegment!) { updateSegment(data: $data) { id } }';
const DELETE_USER_ON_SEGMENT = `mutation ($data: DeleteBizUserOnSegment!) {
  deleteBizUserOnSegment(data: $data) { count }
}`;

/**
 * One Mixpanel webhook body in their real wire shape: everything but
 * `action` — members and page_info included — nests inside `parameters`.
 */
const mixpanelBody = (
  action: string,
  distinctIds: string[],
  options: {
    cohortId?: string;
    cohortName?: string;
    sessionId?: string;
    page?: number;
    totalPages?: number;
    memberExtras?: Record<string, unknown>;
  } = {},
) => ({
  action,
  parameters: {
    mixpanel_project_id: '42',
    mixpanel_cohort_id: options.cohortId ?? 'cohort-1',
    mixpanel_cohort_name: options.cohortName ?? 'Power users',
    mixpanel_session_id: options.sessionId ?? 'sess-1',
    page_info: { total_pages: options.totalPages ?? 1, page_count: options.page ?? 1 },
    members: distinctIds.map((distinctId) => ({
      mixpanel_distinct_id: distinctId,
      email: `${distinctId}@example.com`,
      ...(options.memberExtras ?? {}),
    })),
  },
});

/**
 * End-to-end for inbound cohort sync (ADR 0012): the Mixpanel receiver, the
 * provider-agnostic engine's materialization into a MANUAL segment, the
 * read-only enforcement, and the GraphQL management surface.
 */
describe('Inbound cohort sync (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let token: string;
  let integrationId: string;
  /** The receive path (e.g. /inbound/mixpanel/utin_...), derived from inboundUrl. */
  let inboundPath: string;
  const userIds: string[] = [];
  const externalIds = ['cs_user_1', 'cs_user_2', 'cs_user_3'];

  const post = (path: string, body: unknown) =>
    request(app.getHttpServer())
      .post(path)
      .send(body as object);

  // API_URL is unset in the e2e environment, so inboundUrl comes back as a
  // bare path; production values are absolute.
  const pathOfInboundUrl = (inboundUrl: string) =>
    inboundUrl.startsWith('http') ? new URL(inboundUrl).pathname : inboundUrl;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'gql-cohort-sync' });
    projectId = project.id;
    await buildSubscription(prisma, { projectId, planType: 'starter' });
    const environment = await buildEnvironment(prisma, { projectId });
    environmentId = environment.id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    token = owner.token;
    userIds.push(owner.user.id);

    for (const externalId of externalIds) {
      await buildBizUser(prisma, { environmentId, externalId });
    }

    const created = gqlData(
      await graphql(app, {
        token,
        query: UPSERT_INTEGRATION,
        variables: { data: { environmentId, provider: 'mixpanel', key: 'mp-token' } },
      }),
    ).upsertIntegration;
    integrationId = created.id;
    expect(created.inboundEnabled).toBe(false);
    expect(created.inboundUrl).toBeNull();

    const enabled = gqlData(
      await graphql(app, {
        token,
        query: UPDATE_INBOUND,
        variables: { data: { id: integrationId, enabled: true } },
      }),
    ).updateIntegrationInbound;
    expect(enabled.inboundEnabled).toBe(true);
    expect(enabled.inboundUrl).toMatch(/\/inbound\/mixpanel\/utin_[0-9a-f]{64}$/);
    inboundPath = pathOfInboundUrl(enabled.inboundUrl);
  }, 60000);

  afterAll(async () => {
    if (prisma && projectId) {
      await prisma.integrationSyncedSegment.deleteMany({
        where: { integration: { environment: { projectId } } },
      });
      await teardownProject(prisma, projectId);
      if (userIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }
    await app?.close();
  });

  const syncedMapping = () =>
    prisma.integrationSyncedSegment.findUnique({
      where: {
        integrationId_sourceCohortId: { integrationId, sourceCohortId: 'cohort-1' },
      },
    });

  it('materializes a cohort into a MANUAL segment with matched members only', async () => {
    const res = await post(
      inboundPath,
      mixpanelBody('members', [...externalIds, 'stranger'], { memberExtras: { plan: 'pro' } }),
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ action: 'members', status: 'success' });

    const mapping = await syncedMapping();
    expect(mapping?.sourceCohortName).toBe('Power users');
    expect(mapping?.memberCount).toBe(4);
    expect(mapping?.unresolvedCount).toBe(0);
    expect(mapping?.lastSyncedAt).not.toBeNull();
    // Round state is cleared after the final page of a full roster.
    expect(mapping?.fullSyncSessionId).toBeNull();

    const segment = await prisma.segment.findUnique({ where: { id: mapping?.segmentId } });
    expect(segment?.name).toBe('Power users');
    expect(segment?.dataType).toBe(SegmentDataTypes.MANUAL);
    expect(segment?.source).toBe('mixpanel');
    expect(segment?.sourceId).toBe('cohort-1');
    expect(await prisma.bizUserOnSegment.count({ where: { segmentId: mapping?.segmentId } })).toBe(
      4,
    );
    // The unseen member was CREATED as a bare user — externalId only, none of
    // the wire attributes (plan: 'pro' rode in on every member) land on it.
    const stranger = await prisma.bizUser.findFirst({
      where: { environmentId, externalId: 'stranger' },
    });
    expect(stranger).not.toBeNull();
    expect(stranger?.data).toEqual({});
  });

  it('applies incremental removes and adds idempotently', async () => {
    const mapping = await syncedMapping();

    const remove = await post(inboundPath, mixpanelBody('remove_members', ['cs_user_2']));
    expect(remove.status).toBe(200);
    expect(await prisma.bizUserOnSegment.count({ where: { segmentId: mapping?.segmentId } })).toBe(
      3,
    );

    // Removing a member that does not exist as a user is a no-op — a remove
    // never creates users.
    const removeGhost = await post(inboundPath, mixpanelBody('remove_members', ['cs_ghost']));
    expect(removeGhost.status).toBe(200);
    expect(
      await prisma.bizUser.findFirst({ where: { environmentId, externalId: 'cs_ghost' } }),
    ).toBeNull();

    // Replayed add of an existing member is a no-op, not a duplicate.
    for (let i = 0; i < 2; i++) {
      const add = await post(inboundPath, mixpanelBody('add_members', ['cs_user_1', 'cs_user_2']));
      expect(add.status).toBe(200);
    }
    expect(await prisma.bizUserOnSegment.count({ where: { segmentId: mapping?.segmentId } })).toBe(
      4,
    );
  });

  it('a paged full roster REPLACES: stale members are dropped after the final page', async () => {
    const mapping = await syncedMapping();
    // New full-sync round (fresh session id), roster shrunk to user 1 + 3,
    // split across two pages.
    const pageOne = await post(
      inboundPath,
      mixpanelBody('members', ['cs_user_1'], { sessionId: 'sess-2', page: 1, totalPages: 2 }),
    );
    expect(pageOne.status).toBe(200);
    // Mid-round: nothing dropped yet.
    expect(await prisma.bizUserOnSegment.count({ where: { segmentId: mapping?.segmentId } })).toBe(
      4,
    );

    const pageTwo = await post(
      inboundPath,
      mixpanelBody('members', ['cs_user_3'], { sessionId: 'sess-2', page: 2, totalPages: 2 }),
    );
    expect(pageTwo.status).toBe(200);

    const memberIds = await prisma.bizUserOnSegment.findMany({
      where: { segmentId: mapping?.segmentId },
      select: { bizUser: { select: { externalId: true } } },
    });
    expect(memberIds.map((row) => row.bizUser.externalId).sort()).toEqual([
      'cs_user_1',
      'cs_user_3',
    ]);
  });

  it('follows a provider-side cohort rename', async () => {
    await post(
      inboundPath,
      mixpanelBody('add_members', ['cs_user_1'], { cohortName: 'Power users v2' }),
    );
    const mapping = await syncedMapping();
    expect(mapping?.sourceCohortName).toBe('Power users v2');
    const segment = await prisma.segment.findUnique({ where: { id: mapping?.segmentId } });
    expect(segment?.name).toBe('Power users v2');
  });

  it('counts members with no extractable id as unresolved instead of creating anyone', async () => {
    const before = await syncedMapping();
    const res = await post(inboundPath, {
      action: 'add_members',
      parameters: {
        mixpanel_cohort_id: 'cohort-1',
        mixpanel_cohort_name: 'Power users v2',
        // The id property is simply absent — the shape Mixpanel sends when a
        // configured userIdProperty is not among the exported properties.
        members: [{ email: 'ghost@example.com' }],
      },
    });
    expect(res.status).toBe(200);
    const mapping = await syncedMapping();
    expect(mapping?.unresolvedCount).toBe((before?.unresolvedCount ?? 0) + 1);
    expect(mapping?.memberCount).toBe(before?.memberCount);
    expect(
      await prisma.bizUser.findFirst({ where: { environmentId, externalId: 'ghost@example.com' } }),
    ).toBeNull();
  });

  it('enforces read-only on the synced segment (rename, member edits) while columns stay open', async () => {
    const mapping = await syncedMapping();

    const rename = await graphql(app, {
      token,
      query: UPDATE_SEGMENT,
      variables: { data: { id: mapping?.segmentId, name: 'hijacked' } },
    });
    expect(rename.body.errors).toBeDefined();

    const memberDelete = await graphql(app, {
      token,
      query: DELETE_USER_ON_SEGMENT,
      variables: { data: { segmentId: mapping?.segmentId, bizUserIds: ['whatever'] } },
    });
    expect(memberDelete.body.errors).toBeDefined();

    const columns = await graphql(app, {
      token,
      query: UPDATE_SEGMENT,
      variables: { data: { id: mapping?.segmentId, columns: [] } },
    });
    expect(columns.body.errors).toBeUndefined();
  });

  it('lists synced cohorts on the management surface', async () => {
    const res = await graphql(app, {
      token,
      query: QUERY_SYNCED,
      variables: { integrationId },
    });
    const listed = gqlData(res).queryIntegrationSyncedSegments;
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      sourceCohortId: 'cohort-1',
      sourceCohortName: 'Power users v2',
      segmentName: 'Power users v2',
      memberCount: 2,
    });
  });

  it('refuses recoverably (503) when the switch is off, permanently (404) for a bad token', async () => {
    await graphql(app, {
      token,
      query: UPDATE_INBOUND,
      variables: { data: { id: integrationId, enabled: false } },
    });
    const disabled = await post(inboundPath, mixpanelBody('add_members', ['cs_user_1']));
    expect(disabled.status).toBe(503);
    expect(disabled.body.status).toBe('failure');

    await graphql(app, {
      token,
      query: UPDATE_INBOUND,
      variables: { data: { id: integrationId, enabled: true } },
    });

    const bad = await post('/inbound/mixpanel/utin_definitely_not_a_token', {});
    expect(bad.status).toBe(404);
  });

  it('rotating the token kills the old URL and mints a working new one', async () => {
    const rotated = gqlData(
      await graphql(app, {
        token,
        query: ROTATE_INBOUND,
        variables: { data: { id: integrationId } },
      }),
    ).rotateIntegrationInboundToken;
    const newPath = pathOfInboundUrl(rotated.inboundUrl);
    expect(newPath).not.toBe(inboundPath);

    expect((await post(inboundPath, mixpanelBody('add_members', ['cs_user_1']))).status).toBe(404);
    expect((await post(newPath, mixpanelBody('add_members', ['cs_user_1']))).status).toBe(200);
    inboundPath = newPath;
  });

  it("a sibling environment's integration CONVERGES onto the same segment without cross-reaping", async () => {
    const mappingA = await syncedMapping();
    const segmentId = mappingA?.segmentId as string;

    // Second environment in the SAME project: its own users (one externalId
    // overlapping with environment A), its own integration, its own URL.
    const environmentB = await buildEnvironment(prisma, { projectId, name: 'cohort-env-b' });
    await buildBizUser(prisma, { environmentId: environmentB.id, externalId: 'cs_user_1' });
    await buildBizUser(prisma, { environmentId: environmentB.id, externalId: 'cs_b_only' });
    const integrationB = gqlData(
      await graphql(app, {
        token,
        query: UPSERT_INTEGRATION,
        variables: {
          data: { environmentId: environmentB.id, provider: 'mixpanel', key: 'mp-token-b' },
        },
      }),
    ).upsertIntegration;
    const enabledB = gqlData(
      await graphql(app, {
        token,
        query: UPDATE_INBOUND,
        variables: { data: { id: integrationB.id, enabled: true } },
      }),
    ).updateIntegrationInbound;
    const inboundPathB = pathOfInboundUrl(enabledB.inboundUrl);

    // B's first full roster: same cohort, so it must REUSE A's segment.
    const first = await post(
      inboundPathB,
      mixpanelBody('members', ['cs_user_1', 'cs_b_only'], { sessionId: 'sess-b1' }),
    );
    expect(first.status).toBe(200);
    const mappingB = await prisma.integrationSyncedSegment.findUnique({
      where: {
        integrationId_sourceCohortId: {
          integrationId: integrationB.id,
          sourceCohortId: 'cohort-1',
        },
      },
    });
    expect(mappingB?.segmentId).toBe(segmentId);
    // Per-environment contribution, not the segment total.
    expect(mappingB?.memberCount).toBe(2);

    const membersOf = async () => {
      const rows = await prisma.bizUserOnSegment.findMany({
        where: { segmentId },
        select: { bizUser: { select: { externalId: true, environmentId: true } } },
      });
      return rows
        .map(
          (row) =>
            `${row.bizUser.environmentId === environmentId ? 'A' : 'B'}:${row.bizUser.externalId}`,
        )
        .sort();
    };
    // A contributed cs_user_1 + cs_user_3 in earlier tests; B adds its two.
    expect(await membersOf()).toEqual(['A:cs_user_1', 'A:cs_user_3', 'B:cs_b_only', 'B:cs_user_1']);

    // B's next full roster shrinks to cs_b_only: B's stale member goes, A's
    // members — including its own cs_user_1 — are untouched.
    const second = await post(
      inboundPathB,
      mixpanelBody('members', ['cs_b_only'], { sessionId: 'sess-b2' }),
    );
    expect(second.status).toBe(200);
    expect(await membersOf()).toEqual(['A:cs_user_1', 'A:cs_user_3', 'B:cs_b_only']);

    // Removing B's integration drops only B's mapping; A still feeds the
    // segment, so it stays synced and read-only.
    const removed = await graphql(app, {
      token,
      query: DELETE_INTEGRATION,
      variables: { data: { id: integrationB.id } },
    });
    expect(removed.body.errors).toBeUndefined();
    expect(
      await prisma.integrationSyncedSegment.findFirst({
        where: { integrationId: integrationB.id },
      }),
    ).toBeNull();
    const segment = await prisma.segment.findUnique({ where: { id: segmentId } });
    expect(segment?.source).toBe('mixpanel');
    const rename = await graphql(app, {
      token,
      query: UPDATE_SEGMENT,
      variables: { data: { id: segmentId, name: 'hijacked' } },
    });
    expect(rename.body.errors).toBeDefined();
  });

  it('deleting the integration RELEASES the segment instead of destroying it', async () => {
    const mapping = await syncedMapping();
    const segmentId = mapping?.segmentId as string;

    const res = await graphql(app, {
      token,
      query: DELETE_INTEGRATION,
      variables: { data: { id: integrationId } },
    });
    expect(res.body.errors).toBeUndefined();

    // Mapping gone; this was the LAST mapping, so the segment returns to
    // ordinary life. Members stay — A's two plus the cs_b_only row the
    // departed environment B left behind.
    expect(await prisma.integrationSyncedSegment.findFirst({ where: { segmentId } })).toBeNull();
    const segment = await prisma.segment.findUnique({ where: { id: segmentId } });
    expect(segment?.source).toBe('internal');
    expect(segment?.sourceId).toBeNull();
    expect(await prisma.bizUserOnSegment.count({ where: { segmentId } })).toBe(3);

    // Released = editable again.
    const rename = await graphql(app, {
      token,
      query: UPDATE_SEGMENT,
      variables: { data: { id: segmentId, name: 'now mine' } },
    });
    expect(rename.body.errors).toBeUndefined();
  });
});
