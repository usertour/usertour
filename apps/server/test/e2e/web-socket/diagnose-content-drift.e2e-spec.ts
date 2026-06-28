import type { INestApplication } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';

import {
  AttributeBizTypes,
  AttributeDataType,
  BizEvents,
  ContentDataType,
  ContentPriority,
  Frequency,
  FrequencyUnits,
} from '@usertour/types';

import { ContentDiagnosisService } from '@/web-socket/core/content-diagnosis.service';
import { ContentOrchestratorService } from '@/web-socket/core/content-orchestrator.service';
import { SocketDataService } from '@/web-socket/core/socket-data.service';
import { buildDiagnoseReport } from '@/mcp/tools/diagnose-report';

import { createTestApp } from '../create-test-app';
import {
  buildAttribute,
  buildBizUser,
  buildContent,
  buildEnvironment,
  buildEvent,
  buildProject,
  buildSession,
  buildTheme,
  buildVersion,
} from '../factories';

/**
 * ANTI-DRIFT for diagnose_content: the oracle is the REAL runtime, not a hand-
 * composition. Per scenario we (1) run the tool on the pre-state, then (2) drive the
 * actual `ContentOrchestratorService.toggleContents` with a constructed socketData +
 * a stub socket/server (emit spied), and assert the tool's "no blocker" verdict
 * equals whether the runtime actually activated the content (an active bizSession).
 * If the orchestrator's show/hide logic changes in a way the tool doesn't track, a
 * scenario flips and this goes red. Server-determinable conditions only (no DOM/url)
 * so the comparison is exact. A fresh project per scenario avoids the project-scoped
 * attribute cache going stale.
 */
const URL = 'https://example.com/app';

let rn = 0;
const rid = () => `rule-${rn++}`;
type Cond = Record<string, any>;
const attrRule = (attrId: string, value: string): Cond => ({
  id: rid(),
  type: 'user-attr',
  data: { attrId, logic: 'is', value },
  operators: 'and',
});

const mkConfig = (
  autoStartRules: Cond[],
  opts: {
    hideRules?: Cond[];
    startIfNotComplete?: boolean;
    frequency?: Frequency;
    every?: { unit: FrequencyUnits; duration: number; times?: number };
    priority?: ContentPriority;
  } = {},
) => ({
  enabledAutoStartRules: true,
  autoStartRules,
  enabledHideRules: !!opts.hideRules,
  hideRules: opts.hideRules ?? [],
  autoStartRulesSetting: {
    priority: opts.priority ?? ContentPriority.MEDIUM,
    startIfNotComplete: opts.startIfNotComplete ?? false,
    ...(opts.frequency
      ? { frequency: { frequency: opts.frequency, ...(opts.every ? { every: opts.every } : {}) } }
      : {}),
  },
  hideRulesSetting: {},
});

describe('diagnose_content drift guard (real toggleContents oracle)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let diagnosis: ContentDiagnosisService;
  let orchestrator: ContentOrchestratorService;
  let socketDataService: SocketDataService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    diagnosis = app.get(ContentDiagnosisService);
    orchestrator = app.get(ContentOrchestratorService);
    socketDataService = app.get(SocketDataService);
  });
  afterAll(async () => {
    await app?.close();
  });

  // Fresh project + env per scenario (the project-scoped attribute cache would
  // otherwise serve a stale set after a later scenario adds attributes).
  const fresh = async () => {
    const project = await buildProject(prisma);
    const environment = await buildEnvironment(prisma, { projectId: project.id });
    return { projectId: project.id, environment };
  };

  const planAttr = (projectId: string) =>
    buildAttribute(prisma, {
      projectId,
      codeName: 'plan',
      displayName: 'Plan',
      dataType: AttributeDataType.String,
      bizType: AttributeBizTypes.User,
    });

  const seed = async (args: {
    projectId: string;
    environment: any;
    type: ContentDataType;
    autoStartRules: Cond[];
    opts?: Parameters<typeof mkConfig>[1];
    userData?: Record<string, unknown>;
    dismissedSessions?: number;
    activeSessions?: number;
    /** Reuse an existing user (so two contents can compete for one user). */
    user?: any;
  }) => {
    const { projectId, environment, type } = args;
    const content = await buildContent(prisma, { projectId, environmentId: environment.id, type });
    const theme = await buildTheme(prisma, { projectId });
    const version = await buildVersion(prisma, {
      contentId: content.id,
      themeId: theme.id,
      config: mkConfig(args.autoStartRules, args.opts) as unknown as Prisma.InputJsonValue,
    });
    await prisma.contentOnEnvironment.create({
      data: {
        environmentId: environment.id,
        contentId: content.id,
        published: true,
        publishedVersionId: version.id,
      },
    });
    const user =
      args.user ??
      (await buildBizUser(prisma, {
        environmentId: environment.id,
        data: (args.userData ?? {}) as Prisma.InputJsonValue,
      }));
    // state:1 = ended/dismissed session (state 0 is active).
    for (let i = 0; i < (args.dismissedSessions ?? 0); i++) {
      await buildSession(prisma, {
        bizUserId: user.id,
        contentId: content.id,
        versionId: version.id,
        state: 1,
      });
    }
    for (let i = 0; i < (args.activeSessions ?? 0); i++) {
      await buildSession(prisma, {
        bizUserId: user.id,
        contentId: content.id,
        versionId: version.id,
        state: 0,
      });
    }
    return { content, user, version };
  };

  // Seed an ended session + a dismissed event (FLOW_ENDED) with a chosen age, so the
  // frequency window (isAllowedByAutoStartRulesSetting → latestDismissedEvent) has data.
  const seedDismissedEvent = async (
    projectId: string,
    content: any,
    user: any,
    version: any,
    daysAgo: number,
  ) => {
    const session = await buildSession(prisma, {
      bizUserId: user.id,
      contentId: content.id,
      versionId: version.id,
      state: 1,
    });
    const event = await buildEvent(prisma, { projectId, codeName: BizEvents.FLOW_ENDED });
    await prisma.bizEvent.create({
      data: {
        eventId: event.id,
        bizUserId: user.id,
        bizSessionId: session.id,
        contentId: content.id,
        versionId: version.id,
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      },
    });
  };

  /** The tool's verdict on the CURRENT (pre-toggle) state: does any gate block it? */
  const toolBlocks = async (environment: any, content: any, user: any, type: ContentDataType) => {
    const facts = await diagnosis.diagnose({
      environment,
      contentId: content.id,
      contentType: type,
      externalUserId: String(user.externalId),
      url: URL,
    });
    return buildDiagnoseReport(facts).blockedBy.length > 0;
  };

  /** Drive the REAL orchestrator; report whether it activated the content. */
  const runtimeActivated = async (
    environment: any,
    content: any,
    user: any,
    type: ContentDataType,
  ) => {
    const socket = { id: `diag-${rid()}`, emit: jest.fn(() => true) } as any;
    const server = { in: () => ({ fetchSockets: async () => [] }) } as any;
    const socketData = {
      environment,
      externalUserId: String(user.externalId),
      bizUserId: user.id,
      clientContext: { pageUrl: URL, viewportWidth: 1280, viewportHeight: 800 },
      clientConditions: [],
      waitTimers: [],
    } as any;
    await socketDataService.set(socket, socketData);
    await orchestrator.toggleContents({ server, socket, socketData }, [type]);
    const active = await prisma.bizSession.findFirst({
      where: { contentId: content.id, bizUserId: user.id, state: 0, deleted: false },
    });
    return !!active;
  };

  const check = async (
    environment: any,
    content: any,
    user: any,
    type: ContentDataType,
    expectShow: boolean,
  ) => {
    const blocked = await toolBlocks(environment, content, user, type); // pre-toggle, read-only
    const activated = await runtimeActivated(environment, content, user, type); // real runtime
    expect(blocked).toBe(!activated); // tool blocks ⟺ runtime did NOT activate
    expect(activated).toBe(expectShow);
  };

  it('attribute match → runtime activates, tool says show', async () => {
    const { projectId, environment } = await fresh();
    const attr = await planAttr(projectId);
    const { content, user } = await seed({
      projectId,
      environment,
      type: ContentDataType.FLOW,
      autoStartRules: [attrRule(attr.id, 'pro')],
      userData: { plan: 'pro' },
    });
    await check(environment, content, user, ContentDataType.FLOW, true);
  });

  it('attribute no-match → runtime skips, tool blocks', async () => {
    const { projectId, environment } = await fresh();
    const attr = await planAttr(projectId);
    const { content, user } = await seed({
      projectId,
      environment,
      type: ContentDataType.FLOW,
      autoStartRules: [attrRule(attr.id, 'enterprise')],
      userData: { plan: 'pro' },
    });
    await check(environment, content, user, ContentDataType.FLOW, false);
  });

  it('frequency once + prior session → runtime skips, tool blocks', async () => {
    const { projectId, environment } = await fresh();
    const attr = await planAttr(projectId);
    const { content, user } = await seed({
      projectId,
      environment,
      type: ContentDataType.FLOW,
      autoStartRules: [attrRule(attr.id, 'pro')],
      opts: { frequency: Frequency.ONCE },
      userData: { plan: 'pro' },
      dismissedSessions: 1,
    });
    await check(environment, content, user, ContentDataType.FLOW, false);
  });

  it('frequency multiple, window NOT elapsed → runtime skips, tool blocks', async () => {
    // Shown up to 5×, every 7 days; dismissed just now → the 7-day window hasn't
    // elapsed, so isAllowedByAutoStartRulesSetting rejects it. (times: 5 > 1 prior, so
    // the window — not the count — is the blocker.)
    const { projectId, environment } = await fresh();
    const attr = await planAttr(projectId);
    const { content, user, version } = await seed({
      projectId,
      environment,
      type: ContentDataType.FLOW,
      autoStartRules: [attrRule(attr.id, 'pro')],
      opts: {
        frequency: Frequency.MULTIPLE,
        every: { unit: FrequencyUnits.DAYES, duration: 7, times: 5 },
      },
      userData: { plan: 'pro' },
    });
    await seedDismissedEvent(projectId, content, user, version, 0);
    await check(environment, content, user, ContentDataType.FLOW, false);
  });

  it('frequency multiple, window elapsed → runtime activates, tool says show', async () => {
    // Same config, but dismissed 10 days ago → past the 7-day window and under the
    // 5× cap, so it auto-starts again.
    const { projectId, environment } = await fresh();
    const attr = await planAttr(projectId);
    const { content, user, version } = await seed({
      projectId,
      environment,
      type: ContentDataType.FLOW,
      autoStartRules: [attrRule(attr.id, 'pro')],
      opts: {
        frequency: Frequency.MULTIPLE,
        every: { unit: FrequencyUnits.DAYES, duration: 7, times: 5 },
      },
      userData: { plan: 'pro' },
    });
    await seedDismissedEvent(projectId, content, user, version, 10);
    await check(environment, content, user, ContentDataType.FLOW, true);
  });

  it('dismissed banner (single-session) → runtime skips, tool blocks', async () => {
    const { projectId, environment } = await fresh();
    const attr = await planAttr(projectId);
    const { content, user } = await seed({
      projectId,
      environment,
      type: ContentDataType.BANNER,
      autoStartRules: [attrRule(attr.id, 'pro')],
      userData: { plan: 'pro' },
      dismissedSessions: 1,
    });
    await check(environment, content, user, ContentDataType.BANNER, false);
  });

  it('active session + non-matching start rules → runtime RESUMES it, tool must not block', async () => {
    // A flow with an active session resumes regardless of whether its start rules
    // currently match (findLatestActivatedCustomContentVersions gates only on the
    // active session + hide rules). So the fresh-start gates are moot — the tool must
    // not report start_rules as a blocker when there is an active session.
    const { projectId, environment } = await fresh();
    const attr = await planAttr(projectId);
    const { content, user } = await seed({
      projectId,
      environment,
      type: ContentDataType.FLOW,
      autoStartRules: [attrRule(attr.id, 'enterprise')], // does NOT match plan=pro
      userData: { plan: 'pro' },
      activeSessions: 1,
    });
    await check(environment, content, user, ContentDataType.FLOW, true);
  });

  it('outranked by a higher-priority sibling → runtime starts the winner, tool must block the loser', async () => {
    // Two flows both match for the same user. Singleton types start only the top-
    // priority eligible one ([0] after priorityCompare); the loser passes all its OWN
    // gates yet never shows. The tool must surface this competition, not say "show".
    const { projectId, environment } = await fresh();
    const attr = await planAttr(projectId);
    const winner = await seed({
      projectId,
      environment,
      type: ContentDataType.FLOW,
      autoStartRules: [attrRule(attr.id, 'pro')],
      opts: { priority: ContentPriority.HIGH },
      userData: { plan: 'pro' },
    });
    const loser = await seed({
      projectId,
      environment,
      type: ContentDataType.FLOW,
      autoStartRules: [attrRule(attr.id, 'pro')],
      opts: { priority: ContentPriority.LOW },
      user: winner.user,
    });
    await check(environment, loser.content, winner.user, ContentDataType.FLOW, false);
  });

  it('active slot held by ANOTHER flow’s session → runtime resumes the holder, tool must block the newcomer', async () => {
    // Singleton types start ONE per type. The runtime resumes an existing active session
    // (strategy 1) BEFORE auto-starting fresh candidates (strategy 2). So a different flow
    // with a live session holds the slot and a brand-new flow can't appear — even at the
    // highest priority and with every one of its own gates passing.
    const { projectId, environment } = await fresh();
    const attr = await planAttr(projectId);
    const holder = await seed({
      projectId,
      environment,
      type: ContentDataType.FLOW,
      autoStartRules: [attrRule(attr.id, 'pro')],
      userData: { plan: 'pro' },
      activeSessions: 1,
    });
    const newcomer = await seed({
      projectId,
      environment,
      type: ContentDataType.FLOW,
      autoStartRules: [attrRule(attr.id, 'pro')],
      opts: { priority: ContentPriority.HIGHEST },
      user: holder.user,
    });
    await check(environment, newcomer.content, holder.user, ContentDataType.FLOW, false);
  });

  it('hide rule active (attribute) → runtime skips, tool blocks via hidden', async () => {
    // Start rules match, but an attribute-based hide rule also matches. The runtime's
    // auto-start filter rejects it (isAllowedByHideRules → isActivedHideRules), so the
    // tool's hidden gate must fail too. (Live element/url hide conditions are a separate
    // transient case, marked unknown.)
    const { projectId, environment } = await fresh();
    const attr = await planAttr(projectId);
    const { content, user } = await seed({
      projectId,
      environment,
      type: ContentDataType.FLOW,
      autoStartRules: [attrRule(attr.id, 'pro')],
      opts: { hideRules: [attrRule(attr.id, 'pro')] },
      userData: { plan: 'pro' },
    });
    await check(environment, content, user, ContentDataType.FLOW, false);
  });

  it('fresh banner → runtime activates, tool says show', async () => {
    const { projectId, environment } = await fresh();
    const attr = await planAttr(projectId);
    const { content, user } = await seed({
      projectId,
      environment,
      type: ContentDataType.BANNER,
      autoStartRules: [attrRule(attr.id, 'pro')],
      userData: { plan: 'pro' },
    });
    await check(environment, content, user, ContentDataType.BANNER, true);
  });
});
