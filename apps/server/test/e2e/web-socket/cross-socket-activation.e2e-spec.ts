import { ClientMessageKind, RulesType, ServerMessageKind } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import { initialization } from '@/modules/projects/utils/project-initialization.util';
import {
  buildContent,
  buildEnvironment,
  buildProject,
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
 * Room sync must respect each connection's own page context.
 *
 * When content starts in one tab the server syncs it to every other connection
 * in the user's room (runRoomSyncJob). That sync delivers the originating
 * session verbatim, so without a per-connection check a hide rule excluding the
 * target tab's page is bypassed: an already-open tab shows content it would
 * never be sent on a fresh load. Covers flows and banners, since the leak is
 * above the content-type dispatch.
 *
 * The reverse holds too: a tab where the content is hidden must not end it in
 * the tabs where it shows.
 *
 * Show-only content (banners) has no hide rules to author, so its visibility
 * rests on its show rules holding on the current page — the fan-out gates on
 * those instead. Flows deliberately keep the looser hide-rules-only gate,
 * because a multi-page flow continues onto pages its start rules never matched.
 */
describe('WebSocket v2 cross-socket activation honours per-socket page conditions (e2e)', () => {
  let harness: WebSocketTestApp;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let environmentToken: string;

  let externalUserId: string;

  const ALLOWED_PAGE = 'https://example.test/app';
  const OTHER_ALLOWED_PAGE = 'https://example.test/dashboard';
  const HIDDEN_PAGE = 'https://example.test/checkout';

  let flowContentId: string;
  let bannerContentId: string;
  let showRulesBannerContentId: string;
  let showRulesFlowContentId: string;

  const openClients: WebSocketTestClient[] = [];

  /** Connect as the same user, on a specific page. */
  const connectOnPage = async (pageUrl: string) => {
    const client = await connectWebSocketClient(harness.baseUrl, {
      token: environmentToken,
      externalUserId,
      clientContext: { pageUrl, viewportWidth: 1280, viewportHeight: 800 },
    });
    openClients.push(client);
    return client;
  };

  /**
   * "Hide on the checkout page" — the condition activates (and therefore
   * hides) when the current URL matches, so it blocks only HIDDEN_PAGE.
   */
  const hideOnCheckoutConfig = () => ({
    enabledAutoStartRules: false,
    enabledHideRules: true,
    autoStartRules: [],
    hideRules: [
      {
        id: 'hide-on-checkout',
        type: RulesType.CURRENT_PAGE,
        operators: 'and' as const,
        data: { includes: ['**/checkout**'], excludes: [] },
      },
    ],
    autoStartRulesSetting: {},
    hideRulesSetting: {},
  });

  /**
   * "Show only on the app pages" — the condition activates on ALLOWED_PAGE and
   * OTHER_ALLOWED_PAGE, never on HIDDEN_PAGE. Carries no hide rules, so a page
   * is excluded solely by failing to satisfy the show rules.
   */
  const showOnAppPagesConfig = () => ({
    enabledAutoStartRules: true,
    enabledHideRules: false,
    autoStartRules: [
      {
        id: 'show-on-app-pages',
        type: RulesType.CURRENT_PAGE,
        operators: 'and' as const,
        data: { includes: ['**/app**', '**/dashboard**'], excludes: [] },
      },
    ],
    hideRules: [],
    autoStartRulesSetting: {},
    hideRulesSetting: {},
  });

  const bannerData = () => ({
    embedPlacement: 'top-of-page',
    overlayEmbedOverAppContent: false,
    stickToTopOfViewport: true,
    allowUsersToDismissEmbed: true,
    animateWhenEmbedAppears: false,
    contents: [],
  });

  beforeAll(async () => {
    harness = await createWebSocketTestApp();
    prisma = harness.app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'ws-cross-socket-activation' });
    projectId = project.id;
    await initialization(prisma, projectId);
    const environment = await buildEnvironment(prisma, { projectId, isPrimary: true });
    environmentId = environment.id;
    environmentToken = environment.token;

    const flowContent = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'ws-cross-socket-flow',
      type: 'flow',
    });
    flowContentId = flowContent.id;
    const flowVersion = await buildVersion(prisma, {
      contentId: flowContent.id,
      sequence: 1,
      config: hideOnCheckoutConfig(),
      data: [],
    });
    await buildStep(prisma, {
      versionId: flowVersion.id,
      sequence: 0,
      name: 'Cross Socket Step',
      data: [],
    });
    await publishVersion(prisma, {
      environmentId,
      contentId: flowContent.id,
      versionId: flowVersion.id,
    });

    const bannerContent = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'ws-cross-socket-banner',
      type: 'banner',
    });
    bannerContentId = bannerContent.id;
    const bannerVersion = await buildVersion(prisma, {
      contentId: bannerContent.id,
      sequence: 1,
      config: hideOnCheckoutConfig(),
      data: bannerData(),
    });
    await publishVersion(prisma, {
      environmentId,
      contentId: bannerContent.id,
      versionId: bannerVersion.id,
    });

    const showRulesBannerContent = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'ws-cross-socket-show-rules-banner',
      type: 'banner',
    });
    showRulesBannerContentId = showRulesBannerContent.id;
    const showRulesBannerVersion = await buildVersion(prisma, {
      contentId: showRulesBannerContent.id,
      sequence: 1,
      config: showOnAppPagesConfig(),
      data: bannerData(),
    });
    await publishVersion(prisma, {
      environmentId,
      contentId: showRulesBannerContent.id,
      versionId: showRulesBannerVersion.id,
    });

    // Same show-rules config on a flow, to pin the content-type asymmetry.
    const showRulesFlowContent = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'ws-cross-socket-show-rules-flow',
      type: 'flow',
    });
    showRulesFlowContentId = showRulesFlowContent.id;
    const showRulesFlowVersion = await buildVersion(prisma, {
      contentId: showRulesFlowContent.id,
      sequence: 1,
      config: showOnAppPagesConfig(),
      data: [],
    });
    await buildStep(prisma, {
      versionId: showRulesFlowVersion.id,
      sequence: 0,
      name: 'Show Rules Flow Step',
      data: [],
    });
    await publishVersion(prisma, {
      environmentId,
      contentId: showRulesFlowContent.id,
      versionId: showRulesFlowVersion.id,
    });
  }, 60000);

  beforeEach(() => {
    externalUserId = `ws-cross-socket-user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  });

  afterEach(() => {
    for (const client of openClients.splice(0)) {
      client.disconnect();
    }
  });

  afterAll(async () => {
    for (const client of openClients) {
      client.disconnect();
    }
    if (prisma) {
      await teardownProject(prisma, projectId);
    }
    await harness?.close();
  });

  it('does not activate a flow on another socket whose hide rules exclude its page', async () => {
    const hiddenTab = await connectOnPage(HIDDEN_PAGE);
    const startingTab = await connectOnPage(ALLOWED_PAGE);

    const ack = await startingTab.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: flowContentId,
      startReason: 'start_from_manual',
    });
    expect(ack).toBe(true);

    // The originating tab is on an allowed page, so it receives the session.
    await startingTab.waitForServerMessage(ServerMessageKind.SET_FLOW_SESSION);

    // The tab sitting on the excluded page must not be pushed the session.
    await expect(
      hiddenTab.waitForServerMessage(ServerMessageKind.SET_FLOW_SESSION, 1500),
    ).rejects.toThrow(/Timed out/);
  });

  it('still activates a flow on another socket whose page is allowed', async () => {
    const otherAllowedTab = await connectOnPage(OTHER_ALLOWED_PAGE);
    const startingTab = await connectOnPage(ALLOWED_PAGE);

    const ack = await startingTab.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: flowContentId,
      startReason: 'start_from_manual',
    });
    expect(ack).toBe(true);

    // Cross-tab sync within allowed pages is intended behaviour and must keep working.
    await expect(
      otherAllowedTab.waitForServerMessage(ServerMessageKind.SET_FLOW_SESSION),
    ).resolves.toMatchObject({ kind: ServerMessageKind.SET_FLOW_SESSION });
  });

  it('does not activate a banner on another socket whose hide rules exclude its page', async () => {
    const hiddenTab = await connectOnPage(HIDDEN_PAGE);
    const startingTab = await connectOnPage(ALLOWED_PAGE);

    const ack = await startingTab.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: bannerContentId,
      startReason: 'start_from_manual',
    });
    expect(ack).toBe(true);
    await startingTab.waitForServerMessage(ServerMessageKind.SET_BANNER_SESSION);

    await expect(
      hiddenTab.waitForServerMessage(ServerMessageKind.SET_BANNER_SESSION, 1500),
    ).rejects.toThrow(/Timed out/);
  });

  it('does not activate a banner on another socket whose show rules do not match its page', async () => {
    const hiddenTab = await connectOnPage(HIDDEN_PAGE);
    const startingTab = await connectOnPage(ALLOWED_PAGE);

    const ack = await startingTab.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: showRulesBannerContentId,
      startReason: 'start_from_manual',
    });
    expect(ack).toBe(true);
    await startingTab.waitForServerMessage(ServerMessageKind.SET_BANNER_SESSION);

    // A banner is only ever visible while its show rules hold, so a tab those
    // rules do not reach must not be pushed the session.
    await expect(
      hiddenTab.waitForServerMessage(ServerMessageKind.SET_BANNER_SESSION, 1500),
    ).rejects.toThrow(/Timed out/);
  });

  it('still activates a banner on another socket whose page matches its show rules', async () => {
    const otherAllowedTab = await connectOnPage(OTHER_ALLOWED_PAGE);
    const startingTab = await connectOnPage(ALLOWED_PAGE);

    const ack = await startingTab.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: showRulesBannerContentId,
      startReason: 'start_from_manual',
    });
    expect(ack).toBe(true);

    await expect(
      otherAllowedTab.waitForServerMessage(ServerMessageKind.SET_BANNER_SESSION),
    ).resolves.toMatchObject({ kind: ServerMessageKind.SET_BANNER_SESSION });
  });

  // Characterisation test: pins the deliberate asymmetry between content types.
  // Flows are gated on hide rules only, so unmatched start rules do not block
  // the fan-out. Passes with or without the show-only gate; it fails if a future
  // change extends that gate to every content type.
  it('still activates a flow on another socket whose page does not match its start rules', async () => {
    const hiddenTab = await connectOnPage(HIDDEN_PAGE);
    const startingTab = await connectOnPage(ALLOWED_PAGE);

    const ack = await startingTab.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: showRulesFlowContentId,
      startReason: 'start_from_manual',
    });
    expect(ack).toBe(true);

    // Multi-page flows legitimately continue onto pages their start rules never
    // matched, so the tab on the unmatched page still receives the session.
    await expect(
      hiddenTab.waitForServerMessage(ServerMessageKind.SET_FLOW_SESSION),
    ).resolves.toMatchObject({ kind: ServerMessageKind.SET_FLOW_SESSION });
  });

  it('does not end a flow on the tab where it shows when a tab that hides it evaluates', async () => {
    const startingTab = await connectOnPage(ALLOWED_PAGE);
    const hiddenTab = await connectOnPage(HIDDEN_PAGE);

    const ack = await startingTab.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: flowContentId,
      startReason: 'start_from_manual',
    });
    expect(ack).toBe(true);
    const started = await startingTab.waitForServerMessage(ServerMessageKind.SET_FLOW_SESSION);

    // The hidden tab runs its own evaluation, as it does on every page change.
    expect(await hiddenTab.sendClientMessage(ClientMessageKind.END_BATCH, {})).toBe(true);

    await expect(
      startingTab.waitForServerMessage(ServerMessageKind.UNSET_FLOW_SESSION, 1500),
    ).rejects.toThrow(/Timed out/);
    const session = await prisma.bizSession.findUnique({ where: { id: started.payload.id } });
    expect(session?.state).toBe(0);
  });

  it('does not resume a live flow on a tab whose hide rules exclude its page', async () => {
    const startingTab = await connectOnPage(ALLOWED_PAGE);
    const ack = await startingTab.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: flowContentId,
      startReason: 'start_from_manual',
    });
    expect(ack).toBe(true);
    await startingTab.waitForServerMessage(ServerMessageKind.SET_FLOW_SESSION);

    // A tab opened afterwards on the hidden page evaluates for itself.
    const hiddenTab = await connectOnPage(HIDDEN_PAGE);
    expect(await hiddenTab.sendClientMessage(ClientMessageKind.END_BATCH, {})).toBe(true);
    await expect(
      hiddenTab.waitForServerMessage(ServerMessageKind.SET_FLOW_SESSION, 1500),
    ).rejects.toThrow(/Timed out/);
  });

  it('picks a live flow up once a tab that hid it moves to an allowed page', async () => {
    const hiddenTab = await connectOnPage(HIDDEN_PAGE);
    const startingTab = await connectOnPage(ALLOWED_PAGE);

    const ack = await startingTab.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: flowContentId,
      startReason: 'start_from_manual',
    });
    expect(ack).toBe(true);
    await startingTab.waitForServerMessage(ServerMessageKind.SET_FLOW_SESSION);
    await expect(
      hiddenTab.waitForServerMessage(ServerMessageKind.SET_FLOW_SESSION, 1500),
    ).rejects.toThrow(/Timed out/);

    // Skipping the sync must not lose the session: once the tab leaves the
    // hidden page, its own evaluation resumes the flow.
    expect(
      await hiddenTab.sendClientMessage(ClientMessageKind.UPDATE_CLIENT_CONTEXT, {
        pageUrl: OTHER_ALLOWED_PAGE,
        viewportWidth: 1280,
        viewportHeight: 800,
      }),
    ).toBe(true);
    expect(await hiddenTab.sendClientMessage(ClientMessageKind.END_BATCH, {})).toBe(true);

    await expect(
      hiddenTab.waitForServerMessage(ServerMessageKind.SET_FLOW_SESSION),
    ).resolves.toMatchObject({ kind: ServerMessageKind.SET_FLOW_SESSION });
  });
});
