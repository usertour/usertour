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
  buildStep,
  buildVersion,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/**
 * Analytics with REAL data — the only suite that verifies the NUMBERS, not the
 * envelope. One seed (2 users, 3 sessions, step events, NPS + single-choice
 * answers) feeds four surfaces: the two v2 REST endpoints and the two MCP
 * analytics tools, with the MCP payloads asserted deep-equal to the REST
 * bodies (same service, same query — any divergence is a wrapper bug).
 *
 * The semantics pinned here are exactly the ones prose promises elsewhere:
 * - largest-remainder percentages: counts 3/2/2 → 43/29/28 (naive rounding
 *   gives 43/29/29 = 101; the reconciliation must land on 100 with the
 *   remainder going to the largest fraction);
 * - byDay rows are per-day increments whose totals sum to the range totals;
 * - a step's uniqueCompletions is the flow completion attributed to the step
 *   it fired on (0 on the non-final step is correct);
 * - NPS score/shares from the raw scores (9, 9, 2 → promoters 67%,
 *   detractors 33%, score 33).
 */
describe('API v2 + MCP analytics with real data (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectId: string;
  let environmentId: string;
  let flowId: string;
  let apiToken: string;

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  function rest(path: string) {
    return request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${apiToken}`);
  }

  async function callTool(name: string, args: Record<string, unknown>): Promise<any> {
    const res = await request(app.getHttpServer())
      .post('/mcp')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream')
      .set('Authorization', `Bearer ${apiToken}`)
      .send({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
    const contentType = res.headers['content-type'] ?? '';
    let rpcResponse: any;
    if (contentType.includes('text/event-stream')) {
      const dataLine = (res.text ?? '')
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.startsWith('data:'));
      if (!dataLine) {
        throw new Error(`No SSE data line found in response:\n${res.text}`);
      }
      rpcResponse = JSON.parse(dataLine.slice('data:'.length).trim());
    } else {
      rpcResponse = res.body;
    }
    expect(rpcResponse.result?.isError).toBeFalsy();
    return JSON.parse(rpcResponse.result.content[0].text);
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'analytics-real-data' })).id;
    environmentId = (await buildEnvironment(prisma, { projectId, isPrimary: true })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;

    // The session-based aggregation dereferences these three definitions and
    // silently returns the all-zero envelope when ANY is missing — seeding them
    // is part of the contract under test, not incidental fixture noise.
    const startedDef = await buildEvent(prisma, { projectId, codeName: BizEvents.FLOW_STARTED });
    const completedDef = await buildEvent(prisma, {
      projectId,
      codeName: BizEvents.FLOW_COMPLETED,
    });
    const stepSeenDef = await buildEvent(prisma, { projectId, codeName: BizEvents.FLOW_STEP_SEEN });

    const flow = await buildContent(prisma, {
      projectId,
      environmentId,
      type: 'flow',
      name: 'Onboarding',
    });
    flowId = flow.id;
    const versionId = (await buildVersion(prisma, { contentId: flowId, sequence: 0 })).id;

    // One question per step — the aggregation extracts only the FIRST question
    // block of each step, in step-sequence order.
    await buildStep(prisma, {
      versionId,
      sequence: 0,
      cvid: 'step-1',
      type: 'modal',
      name: 'Welcome',
      data: [
        {
          element: {
            type: 'nps',
            data: {
              cvid: 'q_nps',
              name: 'How likely are you to recommend us?',
              lowLabel: 'Not likely',
              highLabel: 'Very likely',
            },
          },
        },
      ] as unknown as object,
    });
    await buildStep(prisma, {
      versionId,
      sequence: 1,
      cvid: 'step-2',
      type: 'tooltip',
      name: 'Pick a feature',
      data: [
        {
          element: {
            type: 'multiple-choice',
            data: {
              cvid: 'q_feature',
              name: 'Most used feature',
              allowMultiple: false,
              shuffleOptions: false,
              enableOther: false,
              options: [
                { label: 'Users', value: 'users', checked: false },
                { label: 'Tasks', value: 'tasks', checked: false },
                { label: 'Reports', value: 'reports', checked: false },
              ],
            },
          },
        },
      ] as unknown as object,
    });

    const userA = await buildBizUser(prisma, { environmentId });
    const userB = await buildBizUser(prisma, { environmentId });
    const mkSession = (bizUserId: string) =>
      buildSession(prisma, { bizUserId, contentId: flowId, versionId, environmentId, projectId });
    const a1 = await mkSession(userA.id);
    const a2 = await mkSession(userA.id);
    const b1 = await mkSession(userB.id);

    const on = (session: { id: string }, user: { id: string }) => ({
      bizSessionId: session.id,
      bizUserId: user.id,
    });
    await prisma.bizEvent.createMany({
      data: [
        // 3 starts across 2 users → uniqueStarts 2, totalStarts 3.
        { ...on(a1, userA), eventId: startedDef.id, data: { flow_version_id: versionId } },
        { ...on(a2, userA), eventId: startedDef.id, data: { flow_version_id: versionId } },
        { ...on(b1, userB), eventId: startedDef.id, data: { flow_version_id: versionId } },
        // Step 1 seen in all 3 sessions; step 2 in two (a visible drop-off).
        { ...on(a1, userA), eventId: stepSeenDef.id, data: { flow_step_cvid: 'step-1' } },
        { ...on(a2, userA), eventId: stepSeenDef.id, data: { flow_step_cvid: 'step-1' } },
        { ...on(b1, userB), eventId: stepSeenDef.id, data: { flow_step_cvid: 'step-1' } },
        { ...on(a1, userA), eventId: stepSeenDef.id, data: { flow_step_cvid: 'step-2' } },
        { ...on(b1, userB), eventId: stepSeenDef.id, data: { flow_step_cvid: 'step-2' } },
        // One completion, fired on step 2 — attributes to steps[1], not steps[0].
        { ...on(a1, userA), eventId: completedDef.id, data: { flow_step_cvid: 'step-2' } },
      ],
    });

    // Answers join the question purely by cvid + contentId + environmentId.
    // NPS: 9, 9, 2. Choice: 3/2/2 over 7 responses — the largest-remainder
    // case (naive per-option rounding sums to 101). The 4 extra choice rows
    // ride on synthetic session ids (BizAnswer has no FKs; only
    // [bizSessionId, cvid] uniqueness matters).
    const answer = (o: {
      sessionId: string;
      userId: string;
      cvid: string;
      n?: number;
      t?: string;
    }) => ({
      bizEventId: `evt-${o.sessionId}-${o.cvid}`,
      bizSessionId: o.sessionId,
      contentId: flowId,
      versionId,
      bizUserId: o.userId,
      environmentId,
      cvid: o.cvid,
      ...(o.n !== undefined ? { numberAnswer: o.n } : {}),
      ...(o.t !== undefined ? { textAnswer: o.t } : {}),
    });
    await prisma.bizAnswer.createMany({
      data: [
        answer({ sessionId: a1.id, userId: userA.id, cvid: 'q_nps', n: 9 }),
        answer({ sessionId: a2.id, userId: userA.id, cvid: 'q_nps', n: 9 }),
        answer({ sessionId: b1.id, userId: userB.id, cvid: 'q_nps', n: 2 }),
        answer({ sessionId: a1.id, userId: userA.id, cvid: 'q_feature', t: 'users' }),
        answer({ sessionId: a2.id, userId: userA.id, cvid: 'q_feature', t: 'users' }),
        answer({ sessionId: 'synth-1', userId: userA.id, cvid: 'q_feature', t: 'users' }),
        answer({ sessionId: b1.id, userId: userB.id, cvid: 'q_feature', t: 'tasks' }),
        answer({ sessionId: 'synth-2', userId: userB.id, cvid: 'q_feature', t: 'tasks' }),
        answer({ sessionId: 'synth-3', userId: userA.id, cvid: 'q_feature', t: 'reports' }),
        answer({ sessionId: 'synth-4', userId: userB.id, cvid: 'q_feature', t: 'reports' }),
      ],
    });

    const minted = await graphql(app, {
      query: CREATE,
      variables: {
        input: {
          name: 'analytics-data',
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

  it('content analytics reports the seeded funnel numbers', async () => {
    const res = await rest(
      `/v2/projects/${projectId}/content/${flowId}/analytics?environmentId=${environmentId}`,
    );
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      contentType: 'flow',
      uniqueStarts: 2,
      totalStarts: 3,
      uniqueCompletions: 1,
      totalCompletions: 1,
    });

    expect(res.body.steps).toHaveLength(2);
    expect(res.body.steps[0]).toMatchObject({
      cvid: 'step-1',
      uniqueViews: 2,
      totalViews: 3,
      uniqueCompletions: 0,
      totalCompletions: 0,
    });
    expect(res.body.steps[1]).toMatchObject({
      cvid: 'step-2',
      uniqueViews: 2,
      totalViews: 2,
      uniqueCompletions: 1,
      totalCompletions: 1,
    });

    // byDay rows are per-day increments: their totals reproduce the range
    // totals (everything was seeded "now", so it all lands on the last day).
    const byDay = res.body.byDay as Array<{ totalStarts: number; totalCompletions: number }>;
    expect(byDay.length).toBeGreaterThan(0);
    expect(byDay.reduce((sum, day) => sum + day.totalStarts, 0)).toBe(3);
    expect(byDay.reduce((sum, day) => sum + day.totalCompletions, 0)).toBe(1);
    expect(byDay[byDay.length - 1]).toMatchObject({ uniqueStarts: 2, totalStarts: 3 });
  });

  it('question analytics reports distributions, largest-remainder percentages and NPS', async () => {
    const res = await rest(
      `/v2/projects/${projectId}/content/${flowId}/analytics/questions?environmentId=${environmentId}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(2);

    const [nps, choice] = res.body.results;

    expect(nps.question).toMatchObject({ cvid: 'q_nps', type: 'nps' });
    expect(nps.totalResponses).toBe(3);
    expect(nps.distribution).toEqual([
      { answer: 9, count: 2, percentage: 67 },
      { answer: 2, count: 1, percentage: 33 },
    ]);
    expect(nps.nps).toMatchObject({
      score: 33,
      promoters: { count: 2, percentage: 67 },
      passives: { count: 0, percentage: 0 },
      detractors: { count: 1, percentage: 33 },
    });
    const npsByDay = nps.nps.byDay as Array<{ score: number | null; total: number }>;
    expect(npsByDay[npsByDay.length - 1]).toMatchObject({ score: 33, total: 3 });

    // 3/7, 2/7, 2/7 round to 43/29/29 (= 101) naively; the reconciled shares
    // must sum to exactly 100 with the remainder on the largest fraction.
    expect(choice.question).toMatchObject({ cvid: 'q_feature', type: 'multiple-choice' });
    expect(choice.totalResponses).toBe(7);
    expect(choice.distribution).toEqual([
      { answer: 'users', count: 3, percentage: 43 },
      { answer: 'tasks', count: 2, percentage: 29 },
      { answer: 'reports', count: 2, percentage: 28 },
    ]);
  });

  it('MCP get_content_analytics returns the same payload as REST', async () => {
    const restBody = (
      await rest(
        `/v2/projects/${projectId}/content/${flowId}/analytics?environmentId=${environmentId}`,
      )
    ).body;
    const mcpBody = await callTool('get_content_analytics', { contentId: flowId });
    expect(mcpBody).toEqual(restBody);
  });

  it('MCP get_content_question_analytics returns the same payload as REST', async () => {
    const restBody = (
      await rest(
        `/v2/projects/${projectId}/content/${flowId}/analytics/questions?environmentId=${environmentId}`,
      )
    ).body;
    const mcpBody = await callTool('get_content_question_analytics', { contentId: flowId });
    expect(mcpBody.results).toHaveLength(2);
    expect(mcpBody).toEqual(restBody);
  });
});
