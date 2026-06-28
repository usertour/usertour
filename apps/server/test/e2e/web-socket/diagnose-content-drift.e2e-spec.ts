import type { INestApplication } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';

import { AttributeBizTypes, AttributeDataType, ContentDataType, Frequency } from '@usertour/types';

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
  opts: { hideRules?: Cond[]; startIfNotComplete?: boolean; frequency?: Frequency } = {},
) => ({
  enabledAutoStartRules: true,
  autoStartRules,
  enabledHideRules: !!opts.hideRules,
  hideRules: opts.hideRules ?? [],
  autoStartRulesSetting: {
    priority: 'medium',
    startIfNotComplete: opts.startIfNotComplete ?? false,
    ...(opts.frequency ? { frequency: { frequency: opts.frequency } } : {}),
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
    const user = await buildBizUser(prisma, {
      environmentId: environment.id,
      data: (args.userData ?? {}) as Prisma.InputJsonValue,
    });
    // state:1 = ended/dismissed session (state 0 is active).
    for (let i = 0; i < (args.dismissedSessions ?? 0); i++) {
      await buildSession(prisma, {
        bizUserId: user.id,
        contentId: content.id,
        versionId: version.id,
        state: 1,
      });
    }
    return { content, user };
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
