import { PrismaService } from 'nestjs-prisma';
import { Socket } from 'socket.io';
import { ClientMessageKind, ServerMessageKind } from '@usertour/types';

import { initialization } from '@/common/initialization/initialization';
import { SocketDataService } from '@/web-socket/core/socket-data.service';
import {
  buildAttribute,
  buildBizCompany,
  buildContent,
  buildEnvironment,
  buildProject,
  buildSegment,
  buildStep,
  buildVersion,
  publishVersion,
} from '../factories';
import { teardownProject } from '../gql/_support';
import {
  WebSocketTestApp,
  WebSocketTestClient,
  connectWebSocketClient,
  createWebSocketTestApp,
} from './_support';

/**
 * Flow lifecycle kinds (GoToStep / ReportTooltipTargetMissing /
 * UpdateClientContext / EndAllContent) plus the EndBatch auto-start pipeline,
 * driven over a real socket.io connection.
 *
 * The auto-start scenario is the socket-level version of the cross-entity
 * segment semantics: a flow's auto-start rules reference a user segment
 * defined by a company attribute, and whether the flow fires depends on the
 * company most recently passed via UpsertCompany (the SDK group() call) —
 * companyFree does not fire it, switching to companyPro does.
 */
describe('WebSocket v2 flow lifecycle and auto-start (e2e)', () => {
  let harness: WebSocketTestApp;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let environmentToken: string;
  let client: WebSocketTestClient;

  const externalUserId = `ws-flow-user-${Date.now()}`;
  const externalCompanyIdPro = `ws-flow-co-pro-${Date.now()}`;
  const externalCompanyIdFree = `ws-flow-co-free-${Date.now()}`;

  let manualFlowContentId: string;
  let manualFlowSessionId: string;
  let middleStepId: string;
  let autoStartFlowContentId: string;
  let companySubscriptionAttributeId: string;
  let membershipRoleAttributeId: string;

  beforeAll(async () => {
    harness = await createWebSocketTestApp();
    prisma = harness.app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'ws-flow-autostart' });
    projectId = project.id;
    await initialization(prisma, projectId);
    const environment = await buildEnvironment(prisma, { projectId, isPrimary: true });
    environmentId = environment.id;
    environmentToken = environment.token;

    // Manual flow with three steps so a GoToStep to the middle step stays
    // below 100% progress and does not implicitly complete the flow.
    const manualFlowContent = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'ws-manual-flow',
      type: 'flow',
    });
    manualFlowContentId = manualFlowContent.id;
    const manualFlowVersion = await buildVersion(prisma, {
      contentId: manualFlowContent.id,
      sequence: 1,
      config: {},
      data: [],
    });
    await buildStep(prisma, {
      versionId: manualFlowVersion.id,
      sequence: 0,
      name: 'Step 1',
      data: [],
    });
    const middleStep = await buildStep(prisma, {
      versionId: manualFlowVersion.id,
      sequence: 1,
      name: 'Step 2',
      data: [],
    });
    middleStepId = middleStep.id;
    await buildStep(prisma, {
      versionId: manualFlowVersion.id,
      sequence: 2,
      name: 'Step 3',
      data: [],
    });
    await publishVersion(prisma, {
      environmentId,
      contentId: manualFlowContent.id,
      versionId: manualFlowVersion.id,
    });

    // Cross-entity attributes are created before the first connection: the
    // project's attribute list gets cached on first evaluation, so an
    // attribute created later (inside a nested describe) would be invisible
    // to condition evaluation for the rest of the suite.
    const companySubscriptionAttribute = await buildAttribute(prisma, {
      projectId,
      codeName: 'subscription',
      displayName: 'Subscription',
      bizType: 2,
      dataType: 2,
    });
    membershipRoleAttributeId = (
      await buildAttribute(prisma, {
        projectId,
        codeName: 'role',
        displayName: 'Role',
        bizType: 3,
        dataType: 2,
      })
    ).id;
    companySubscriptionAttributeId = companySubscriptionAttribute.id;
    await buildBizCompany(prisma, {
      environmentId,
      externalId: externalCompanyIdPro,
      data: { subscription: 'pro' },
    });
    await buildBizCompany(prisma, {
      environmentId,
      externalId: externalCompanyIdFree,
      data: { subscription: 'free' },
    });
    const segment = await buildSegment(prisma, {
      projectId,
      environmentId,
      bizType: 1,
      dataType: 2,
      data: [
        {
          type: 'user-attr',
          operators: 'and',
          data: { attrId: companySubscriptionAttribute.id, logic: 'is', value: 'pro' },
        },
      ],
    });

    // Auto-start flow gated on that segment.
    const autoStartFlowContent = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'ws-autostart-flow',
      type: 'flow',
    });
    autoStartFlowContentId = autoStartFlowContent.id;
    const autoStartFlowVersion = await buildVersion(prisma, {
      contentId: autoStartFlowContent.id,
      sequence: 1,
      config: {
        enabledAutoStartRules: true,
        autoStartRules: [
          { type: 'segment', operators: 'and', data: { segmentId: segment.id, logic: 'is' } },
        ],
        autoStartRulesSetting: { wait: 0 },
      },
      data: [],
    });
    await buildStep(prisma, {
      versionId: autoStartFlowVersion.id,
      sequence: 0,
      name: 'Auto Step 1',
      data: [],
    });
    await publishVersion(prisma, {
      environmentId,
      contentId: autoStartFlowContent.id,
      versionId: autoStartFlowVersion.id,
    });

    client = await connectWebSocketClient(harness.baseUrl, {
      token: environmentToken,
      externalUserId,
    });
  }, 60000);

  afterAll(async () => {
    client?.disconnect();
    if (prisma) {
      await teardownProject(prisma, projectId);
    }
    await harness?.close();
  });

  const findAutoStartSession = () =>
    prisma.bizSession.findFirst({
      where: {
        contentId: autoStartFlowContentId,
        bizUser: { externalId: externalUserId, environmentId },
        deleted: false,
      },
    });

  it('StartContent opens the manual flow session', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: manualFlowContentId,
      startReason: 'start_from_manual',
    });
    expect(ack).toBe(true);
    await client.waitForServerMessage(ServerMessageKind.SET_FLOW_SESSION);

    const bizSession = await prisma.bizSession.findFirst({
      where: {
        contentId: manualFlowContentId,
        bizUser: { externalId: externalUserId, environmentId },
        deleted: false,
        state: 0,
      },
    });
    expect(bizSession).not.toBeNull();
    manualFlowSessionId = bizSession?.id as string;
  });

  it('GoToStep tracks flow_step_seen for the target step', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.GO_TO_STEP, {
      sessionId: manualFlowSessionId,
      stepId: middleStepId,
    });
    expect(ack).toBe(true);

    const stepSeenEvents = await prisma.bizEvent.findMany({
      where: {
        bizSessionId: manualFlowSessionId,
        event: { codeName: 'flow_step_seen' },
      },
    });
    const seenStepIds = stepSeenEvents.map(
      (bizEvent) => (bizEvent.data as Record<string, unknown>).flow_step_id,
    );
    expect(seenStepIds).toContain(middleStepId);
  });

  it('ReportTooltipTargetMissing tracks tooltip_target_missing', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.REPORT_TOOLTIP_TARGET_MISSING, {
      sessionId: manualFlowSessionId,
      stepId: middleStepId,
    });
    expect(ack).toBe(true);

    const missingEvent = await prisma.bizEvent.findFirst({
      where: {
        bizSessionId: manualFlowSessionId,
        event: { codeName: 'tooltip_target_missing' },
      },
    });
    expect(missingEvent).not.toBeNull();
  });

  it('UpdateClientContext replaces the stored client context', async () => {
    const updatedPageUrl = 'https://example.test/settings';
    const ack = await client.sendClientMessage(ClientMessageKind.UPDATE_CLIENT_CONTEXT, {
      pageUrl: updatedPageUrl,
      viewportWidth: 1440,
      viewportHeight: 900,
    });
    expect(ack).toBe(true);

    const socketDataService = harness.app.get(SocketDataService);
    const socketData = await socketDataService.get({
      id: client.socket.id as string,
    } as unknown as Socket);
    expect(socketData?.clientContext?.pageUrl).toBe(updatedPageUrl);
  });

  it('EndAllContent cancels the active flow session', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.END_ALL_CONTENT, {});
    expect(ack).toBe(true);

    const endedSession = await prisma.bizSession.findUnique({
      where: { id: manualFlowSessionId },
    });
    expect(endedSession?.state).not.toBe(0);
  });

  it('EndBatch does not auto-start the segment-gated flow without a matching company', async () => {
    // No company on the session yet: the segment's company condition has no
    // context and must evaluate to false.
    const noCompanyAck = await client.sendClientMessage(ClientMessageKind.END_BATCH, {});
    expect(noCompanyAck).toBe(true);
    expect(await findAutoStartSession()).toBeNull();

    // group() into the free company: still no match.
    const upsertAck = await client.sendClientMessage(ClientMessageKind.UPSERT_COMPANY, {
      externalUserId,
      externalCompanyId: externalCompanyIdFree,
      attributes: {},
      membership: {},
    });
    expect(upsertAck).toBe(true);
    const freeCompanyAck = await client.sendClientMessage(ClientMessageKind.END_BATCH, {});
    expect(freeCompanyAck).toBe(true);
    expect(await findAutoStartSession()).toBeNull();
  });

  it('EndBatch auto-starts the flow after switching to the matching company', async () => {
    const upsertAck = await client.sendClientMessage(ClientMessageKind.UPSERT_COMPANY, {
      externalUserId,
      externalCompanyId: externalCompanyIdPro,
      attributes: {},
      membership: {},
    });
    expect(upsertAck).toBe(true);

    const endBatchAck = await client.sendClientMessage(ClientMessageKind.END_BATCH, {});
    expect(endBatchAck).toBe(true);

    const autoStartSession = await findAutoStartSession();
    expect(autoStartSession).not.toBeNull();
    expect(autoStartSession?.state).toBe(0);
    expect(autoStartSession?.bizCompanyId).not.toBeNull();

    const flowStarted = await prisma.bizEvent.findFirst({
      where: {
        bizSessionId: autoStartSession?.id as string,
        event: { codeName: 'flow_started' },
      },
    });
    expect(flowStarted).not.toBeNull();
  });

  describe('company segment with cross-type OR conditions', () => {
    // Regression for the per-bizType bucket partition the compiled filters
    // replaced: "subscription is enterprise OR some member is admin" used to
    // evaluate as an AND across the buckets and never matched a pro company
    // with an admin member. Runs in its own environment — flows are
    // singletons per user, so the outer environment's auto-start contents
    // would steal the session slot.
    const orExternalUserId = `ws-or-user-${Date.now()}`;
    const orExternalCompanyId = `ws-or-co-${Date.now()}`;
    let orEnvironmentToken: string;
    let orFlowContentId: string;

    beforeAll(async () => {
      const environment = await buildEnvironment(prisma, { projectId });
      orEnvironmentToken = environment.token;

      const companySegment = await buildSegment(prisma, {
        projectId,
        environmentId: environment.id,
        bizType: 2,
        dataType: 2,
        data: [
          {
            type: 'user-attr',
            operators: 'or',
            data: { attrId: companySubscriptionAttributeId, logic: 'is', value: 'enterprise' },
          },
          {
            type: 'user-attr',
            operators: 'or',
            data: { attrId: membershipRoleAttributeId, logic: 'is', value: 'admin' },
          },
        ],
      });

      const orFlowContent = await buildContent(prisma, {
        projectId,
        environmentId: environment.id,
        name: 'ws-company-segment-flow',
        type: 'flow',
      });
      orFlowContentId = orFlowContent.id;
      const orFlowVersion = await buildVersion(prisma, {
        contentId: orFlowContent.id,
        sequence: 1,
        config: {
          enabledAutoStartRules: true,
          autoStartRules: [
            {
              type: 'segment',
              operators: 'and',
              data: { segmentId: companySegment.id, logic: 'is' },
            },
          ],
          autoStartRulesSetting: { wait: 0 },
        },
        data: [],
      });
      await buildStep(prisma, {
        versionId: orFlowVersion.id,
        sequence: 0,
        name: 'OR Step',
        data: [],
      });
      await publishVersion(prisma, {
        environmentId: environment.id,
        contentId: orFlowContent.id,
        versionId: orFlowVersion.id,
      });
    }, 60000);

    it('honors OR across entity types when evaluating the current company', async () => {
      const orClient = await connectWebSocketClient(harness.baseUrl, {
        token: orEnvironmentToken,
        externalUserId: orExternalUserId,
      });

      // The company is pro (not enterprise) but the connecting member is an
      // admin — only the membership branch of the OR can match.
      const upsertAck = await orClient.sendClientMessage(ClientMessageKind.UPSERT_COMPANY, {
        externalUserId: orExternalUserId,
        externalCompanyId: orExternalCompanyId,
        attributes: { subscription: 'pro' },
        membership: { role: 'admin' },
      });
      expect(upsertAck).toBe(true);

      const endBatchAck = await orClient.sendClientMessage(ClientMessageKind.END_BATCH, {});
      expect(endBatchAck).toBe(true);

      const orFlowSession = await prisma.bizSession.findFirst({
        where: {
          contentId: orFlowContentId,
          bizUser: { externalId: orExternalUserId },
          deleted: false,
        },
      });
      expect(orFlowSession).not.toBeNull();
      expect(orFlowSession?.state).toBe(0);

      orClient.disconnect();
    });
  });
});
