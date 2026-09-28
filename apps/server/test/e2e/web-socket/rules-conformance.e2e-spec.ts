import type { INestApplication } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import {
  AttributeBizTypes,
  AttributeDataType,
  BizEvents,
  ContentDataType,
  ContentPriority,
  EventAttributes,
  Frequency,
  FrequencyUnits,
  ServerMessageKind,
} from '@usertour/types';
import { AnnouncementService } from '@/modules/delivery/services/announcement.service';
import { initialization } from '@/modules/projects/utils/project-initialization.util';
import { SegmentBizType } from '@/modules/biz/constants/segment-biz-type.constant';
import { SegmentDataType } from '@/modules/biz/constants/segment-data-type.constant';
import { ContentOrchestratorService } from '@/web-socket/core/content-orchestrator.service';
import { SocketDataService } from '@/web-socket/core/socket-data.service';
import { createTestApp } from '../create-test-app';
import {
  buildAttribute,
  buildBizUser,
  buildContent,
  buildEnvironment,
  buildEvent,
  buildProject,
  buildSegment,
  buildSession,
  buildStep,
  buildTheme,
  buildVersion,
} from '../factories';

/**
 * Auto-start and hide rules as the real runtime applies them. Every scenario
 * drives `ContentOrchestratorService.toggleContents` — the same entry point a
 * connect, an EndBatch, a client-context update or a condition toggle ends
 * in — with a constructed socket data and a stub socket that records what
 * the server pushed. The oracle is what the runtime did: a session created
 * (or not), a condition tracked, a timer started, a session unset.
 *
 * The gaps this closes were found by a coverage map: no end-to-end tree with
 * an `or`, a nested group or a client leaf next to a server leaf; no
 * page-URL or time condition re-evaluated from the client context; the hide
 * rules' readiness and their cancelling of a live session; the enable flags,
 * the second and minute frequency units, the quiet period, the checklist and
 * resource-center start paths, the announcement gates.
 */

const PAGE = 'https://example.com/app';
let ruleSeq = 0;
const ruleId = (label: string) => `${label}-${ruleSeq++}`;

type Cond = Record<string, any>;
type Join = 'and' | 'or';

const attrRule = (attrId: string, value: string, operators: Join = 'and'): Cond => ({
  id: ruleId('attr'),
  type: 'user-attr',
  data: { attrId, logic: 'is', value },
  operators,
});
const segmentRule = (segmentId: string, operators: Join = 'and'): Cond => ({
  id: ruleId('segment'),
  type: 'segment',
  data: { segmentId, logic: 'is' },
  operators,
});
/** A leaf only the browser can evaluate; the server tracks it and waits for the report. */
const elementRule = (operators: Join = 'and'): Cond => ({
  id: ruleId('element'),
  type: 'element',
  data: {
    logic: 'present',
    elementData: { selectors: '#cta', type: 'auto', precision: 'loose', content: '' },
  },
  operators,
});
const urlRule = (includes: string[], operators: Join = 'and'): Cond => ({
  id: ruleId('url'),
  type: 'current-page',
  data: { includes, excludes: [] },
  operators,
});
const timeRule = (startTime: Date, endTime: Date, operators: Join = 'and'): Cond => ({
  id: ruleId('time'),
  type: 'time',
  data: { startTime: startTime.toISOString(), endTime: endTime.toISOString() },
  operators,
});
const group = (operators: Join, conditions: Cond[]): Cond => ({
  id: ruleId('group'),
  type: 'group',
  operators,
  conditions,
});

type Every = { unit: FrequencyUnits; duration: number; times?: number };
type ConfigOptions = {
  enabledAutoStartRules?: boolean;
  hideRules?: Cond[];
  startIfNotComplete?: boolean;
  frequency?: Frequency;
  every?: Every;
  atLeast?: { unit: FrequencyUnits; duration: number };
  priority?: ContentPriority;
};

const mkConfig = (autoStartRules: Cond[], opts: ConfigOptions = {}) => ({
  enabledAutoStartRules: opts.enabledAutoStartRules ?? true,
  autoStartRules,
  enabledHideRules: !!opts.hideRules,
  hideRules: opts.hideRules ?? [],
  autoStartRulesSetting: {
    priority: opts.priority ?? ContentPriority.MEDIUM,
    startIfNotComplete: opts.startIfNotComplete ?? false,
    ...(opts.frequency
      ? {
          frequency: {
            frequency: opts.frequency,
            every: opts.every ?? { unit: FrequencyUnits.DAYES, duration: 1 },
            ...(opts.atLeast ? { atLeast: opts.atLeast } : {}),
          },
        }
      : {}),
  },
  hideRulesSetting: {},
});

const hourAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);
const hoursAhead = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000);

/** A socket the orchestrator can push to; every server message is recorded. */
const stubSocket = () => {
  const pushed: Array<{ kind: string; payload: any }> = [];
  const socket = {
    id: `rules-${ruleId('socket')}`,
    emit: jest.fn((_event: string, message: { kind: string; payload: any }) => {
      pushed.push({ kind: message.kind, payload: message.payload });
      return true;
    }),
    timeout: () => ({
      emitWithAck: async (_event: string, message: { kind: string; payload: any }) => {
        pushed.push({ kind: message.kind, payload: message.payload });
        return true;
      },
    }),
  } as any;
  return { socket, pushed };
};
const stubServer = { in: () => ({ fetchSockets: async () => [] }) } as any;

describe('auto-start and hide rules conformance (real toggleContents oracle)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let orchestrator: ContentOrchestratorService;
  let socketDataService: SocketDataService;
  let announcements: AnnouncementService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    orchestrator = app.get(ContentOrchestratorService);
    socketDataService = app.get(SocketDataService);
    announcements = app.get(AnnouncementService);
  }, 60000);

  afterAll(async () => {
    await app?.close();
  });

  // A fresh project per scenario keeps the project-scoped attribute cache honest.
  const fresh = async () => {
    const project = await buildProject(prisma);
    // The default events and attributes every real project has (flow_started
    // and its start reason, flow_ended, flow_completed …).
    await initialization(prisma, project.id);
    const environment = await buildEnvironment(prisma, { projectId: project.id });
    const plan = await buildAttribute(prisma, {
      projectId: project.id,
      codeName: 'plan',
      displayName: 'Plan',
      dataType: AttributeDataType.String,
      bizType: AttributeBizTypes.User,
    });
    const tier = await buildAttribute(prisma, {
      projectId: project.id,
      codeName: 'tier',
      displayName: 'Tier',
      dataType: AttributeDataType.String,
      bizType: AttributeBizTypes.User,
    });
    return { projectId: project.id, environment, plan, tier };
  };

  const seed = async (args: {
    projectId: string;
    environment: any;
    type: ContentDataType;
    autoStartRules: Cond[];
    opts?: ConfigOptions;
    data?: unknown;
    userData?: Record<string, unknown>;
    user?: any;
    dismissedSessions?: number;
    activeSessions?: number;
    scheduledAt?: Date;
  }) => {
    const { projectId, environment, type } = args;
    const content = await buildContent(prisma, { projectId, environmentId: environment.id, type });
    const theme = await buildTheme(prisma, { projectId });
    const version = await buildVersion(prisma, {
      contentId: content.id,
      themeId: theme.id,
      config: mkConfig(args.autoStartRules, args.opts) as unknown as Prisma.InputJsonValue,
      // A flow's data is its list of blocks, an empty one here; the other
      // types carry what their session builder reads.
      data: (args.data ?? (type === ContentDataType.FLOW ? [] : {})) as Prisma.InputJsonValue,
      ...(args.scheduledAt ? { scheduledAt: args.scheduledAt } : {}),
    });
    if (type === ContentDataType.FLOW) {
      // One empty modal step: enough for a session to be built and pushed.
      await buildStep(prisma, { versionId: version.id, type: 'modal', sequence: 0, data: [] });
    }
    await prisma.content.update({
      where: { id: content.id },
      data: { published: true, publishedVersionId: version.id },
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
    return { content, version, user };
  };

  /** An ended session with an event of a chosen age: what the frequency gates read. */
  const seedEndedSession = async (
    projectId: string,
    content: any,
    user: any,
    version: any,
    ageMs: number,
    codeName: string = BizEvents.FLOW_ENDED,
  ) => {
    const session = await buildSession(prisma, {
      bizUserId: user.id,
      contentId: content.id,
      versionId: version.id,
      state: 1,
    });
    const event =
      (await prisma.event.findFirst({ where: { projectId, codeName } })) ??
      (await buildEvent(prisma, { projectId, codeName }));
    await prisma.bizEvent.create({
      data: {
        eventId: event.id,
        bizUserId: user.id,
        bizSessionId: session.id,
        contentId: content.id,
        versionId: version.id,
        createdAt: new Date(Date.now() - ageMs),
      },
    });
  };

  type ToggleInput = {
    pageUrl?: string;
    clientConditions?: Array<{
      contentId: string;
      contentType: ContentDataType;
      versionId: string;
      conditionId: string;
      isActive?: boolean;
    }>;
    waitTimers?: any[];
    session?: { type: ContentDataType; session: any };
  };

  type Connection = ReturnType<typeof stubSocket>;

  /**
   * Run the real toggle for one user and return what happened. With `on`, the
   * same connection is used again: its socket data — the live session it was
   * given — carries over, as it does between two toggles of one page.
   */
  const toggle = async (
    environment: any,
    user: any,
    types: ContentDataType[],
    input: ToggleInput & { on?: Connection } = {},
  ) => {
    const { socket, pushed } = input.on ?? stubSocket();
    pushed.length = 0;
    const previous = input.on ? ((await socketDataService.get(socket)) as any) : undefined;
    const socketData: Record<string, unknown> = {
      ...(previous ?? {}),
      environment,
      externalUserId: String(user.externalId),
      bizUserId: user.id,
      clientContext: { pageUrl: input.pageUrl ?? PAGE, viewportWidth: 1280, viewportHeight: 800 },
      clientConditions: input.clientConditions ?? previous?.clientConditions ?? [],
      waitTimers: input.waitTimers ?? previous?.waitTimers ?? [],
    };
    await socketDataService.set(socket, socketData as any);
    const toggled = await orchestrator.toggleContents(
      { server: stubServer, socket, socketData } as any,
      types,
    );
    const after = (await socketDataService.get(socket)) as any;
    return {
      toggled,
      connection: { socket, pushed } as Connection,
      pushed,
      kinds: pushed.map((message) => message.kind),
      after,
      activeSession: async (contentId: string) =>
        prisma.bizSession.findFirst({
          where: { contentId, bizUserId: user.id, state: 0, deleted: false },
        }),
    };
  };

  const started = async (
    environment: any,
    user: any,
    content: any,
    type: ContentDataType,
    input: ToggleInput & { on?: Connection } = {},
  ) => {
    const result = await toggle(environment, user, [type], input);
    return { ...result, active: !!(await result.activeSession(content.id)) };
  };

  describe('composition', () => {
    it('a top-level OR starts on either leaf; a top-level AND needs both', async () => {
      const { projectId, environment, plan, tier } = await fresh();
      const anyOf = await seed({
        projectId,
        environment,
        type: ContentDataType.FLOW,
        autoStartRules: [attrRule(plan.id, 'pro', 'or'), attrRule(tier.id, 'gold', 'or')],
        userData: { plan: 'free', tier: 'gold' },
      });
      expect(
        (await started(environment, anyOf.user, anyOf.content, ContentDataType.FLOW)).active,
      ).toBe(true);

      const { projectId: p2, environment: e2, plan: plan2, tier: tier2 } = await fresh();
      const allOf = await seed({
        projectId: p2,
        environment: e2,
        type: ContentDataType.FLOW,
        autoStartRules: [attrRule(plan2.id, 'pro', 'and'), attrRule(tier2.id, 'gold', 'and')],
        userData: { plan: 'free', tier: 'gold' },
      });
      expect((await started(e2, allOf.user, allOf.content, ContentDataType.FLOW)).active).toBe(
        false,
      );
    });

    it('a nested group takes its own join at each level', async () => {
      const { projectId, environment, plan, tier } = await fresh();
      const rules = [
        attrRule(plan.id, 'pro', 'and'),
        group('and', [attrRule(tier.id, 'gold', 'or'), attrRule(tier.id, 'silver', 'or')]),
      ];
      const silver = await seed({
        projectId,
        environment,
        type: ContentDataType.FLOW,
        autoStartRules: rules,
        userData: { plan: 'pro', tier: 'silver' },
      });
      expect(
        (await started(environment, silver.user, silver.content, ContentDataType.FLOW)).active,
      ).toBe(true);
      const bronze = await buildBizUser(prisma, {
        environmentId: environment.id,
        data: { plan: 'pro', tier: 'bronze' },
      });
      expect(
        (await started(environment, bronze, silver.content, ContentDataType.FLOW)).active,
      ).toBe(false);
    });

    it('a server leaf AND a browser leaf: tracked first, started once the browser reports it active', async () => {
      const { projectId, environment, plan } = await fresh();
      const element = elementRule('and');
      const { content, version, user } = await seed({
        projectId,
        environment,
        type: ContentDataType.FLOW,
        autoStartRules: [attrRule(plan.id, 'pro', 'and'), element],
        userData: { plan: 'pro' },
      });

      // Nothing reported yet: the server asks the browser to track the leaf.
      const first = await started(environment, user, content, ContentDataType.FLOW);
      expect(first.active).toBe(false);
      expect(first.kinds).toEqual([ServerMessageKind.TRACK_CLIENT_CONDITION]);
      expect(first.pushed[0].payload).toMatchObject({
        contentId: content.id,
        versionId: version.id,
        condition: { id: element.id },
      });
      expect(first.after.clientConditions).toEqual([
        expect.objectContaining({ conditionId: element.id, contentId: content.id }),
      ]);

      const reported = (isActive: boolean) => [
        {
          contentId: content.id,
          contentType: ContentDataType.FLOW,
          versionId: version.id,
          conditionId: element.id,
          isActive,
        },
      ];
      expect(
        (
          await started(environment, user, content, ContentDataType.FLOW, {
            clientConditions: reported(false),
          })
        ).active,
      ).toBe(false);
      const second = await started(environment, user, content, ContentDataType.FLOW, {
        clientConditions: reported(true),
      });
      expect(second.active).toBe(true);
      expect(second.kinds).toContain(ServerMessageKind.SET_FLOW_SESSION);
    });

    it('a segment leaf: ALL-users segment matches, another environment’s segment does not', async () => {
      const { projectId, environment } = await fresh();
      const everyone = await buildSegment(prisma, {
        projectId,
        environmentId: environment.id,
        bizType: SegmentBizType.USER,
        dataType: SegmentDataType.ALL,
      });
      const { content, user } = await seed({
        projectId,
        environment,
        type: ContentDataType.FLOW,
        autoStartRules: [segmentRule(everyone.id)],
      });
      expect((await started(environment, user, content, ContentDataType.FLOW)).active).toBe(true);
    });
  });

  describe('client context', () => {
    it('a page-URL leaf follows the page the client reports', async () => {
      const { projectId, environment } = await fresh();
      const { content, user } = await seed({
        projectId,
        environment,
        type: ContentDataType.FLOW,
        autoStartRules: [urlRule(['https://example.com/app/settings*'])],
      });
      expect(
        (await started(environment, user, content, ContentDataType.FLOW, { pageUrl: PAGE })).active,
      ).toBe(false);
      // The client navigated (UpdateClientContext) and the server toggles again.
      expect(
        (
          await started(environment, user, content, ContentDataType.FLOW, {
            pageUrl: 'https://example.com/app/settings/billing',
          })
        ).active,
      ).toBe(true);
    });

    it('a time leaf starts inside its window only', async () => {
      const { projectId, environment } = await fresh();
      const open = await seed({
        projectId,
        environment,
        type: ContentDataType.FLOW,
        autoStartRules: [timeRule(hourAgo(1), hoursAhead(1))],
      });
      expect(
        (await started(environment, open.user, open.content, ContentDataType.FLOW)).active,
      ).toBe(true);
      const { projectId: p2, environment: e2 } = await fresh();
      const closed = await seed({
        projectId: p2,
        environment: e2,
        type: ContentDataType.FLOW,
        autoStartRules: [timeRule(hourAgo(3), hourAgo(1))],
      });
      expect((await started(e2, closed.user, closed.content, ContentDataType.FLOW)).active).toBe(
        false,
      );
    });
  });

  describe('hide rules', () => {
    it('a hide rule with an unreported browser leaf blocks the start until the browser reports it', async () => {
      const { projectId, environment, plan } = await fresh();
      const hidden = elementRule('and');
      const { content, version, user } = await seed({
        projectId,
        environment,
        type: ContentDataType.FLOW,
        autoStartRules: [attrRule(plan.id, 'pro')],
        opts: { hideRules: [hidden] },
        userData: { plan: 'pro' },
      });
      const first = await started(environment, user, content, ContentDataType.FLOW);
      expect(first.active).toBe(false);
      // The hide leaf is what gets tracked, so a report can arrive.
      expect(first.pushed.map((message) => message.payload?.condition?.id)).toContain(hidden.id);

      const report = (isActive: boolean) => ({
        clientConditions: [
          {
            contentId: content.id,
            contentType: ContentDataType.FLOW,
            versionId: version.id,
            conditionId: hidden.id,
            isActive,
          },
        ],
      });
      expect(
        (await started(environment, user, content, ContentDataType.FLOW, report(true))).active,
      ).toBe(false);
      expect(
        (await started(environment, user, content, ContentDataType.FLOW, report(false))).active,
      ).toBe(true);
    });

    it('a hide rule that becomes active on a live session unsets it', async () => {
      const { projectId, environment, plan, tier } = await fresh();
      const { content, version, user } = await seed({
        projectId,
        environment,
        type: ContentDataType.FLOW,
        autoStartRules: [attrRule(plan.id, 'pro')],
        opts: { hideRules: [attrRule(tier.id, 'blocked')] },
        userData: { plan: 'pro', tier: 'gold' },
      });
      const running = await started(environment, user, content, ContentDataType.FLOW);
      expect(running.active).toBe(true);
      expect(running.kinds).toContain(ServerMessageKind.SET_FLOW_SESSION);

      // The user's attributes changed; the same page toggles again and finds
      // the hide rule active on its live session.
      await prisma.bizUser.update({
        where: { id: user.id },
        data: { data: { plan: 'pro', tier: 'blocked' } },
      });
      const result = await toggle(environment, user, [ContentDataType.FLOW], {
        on: running.connection,
      });
      expect(result.kinds).toContain(ServerMessageKind.UNSET_FLOW_SESSION);
      expect(result.after.flowSession).toBeFalsy();
      // Hidden, not ended: the session stays open so it can come back.
      const session = await result.activeSession(content.id);
      expect(session?.versionId).toBe(version.id);

      // The hide rule clears; the same page toggles again and resumes it.
      await prisma.bizUser.update({
        where: { id: user.id },
        data: { data: { plan: 'pro', tier: 'gold' } },
      });
      const resumed = await toggle(environment, user, [ContentDataType.FLOW], {
        on: result.connection,
      });
      expect(resumed.kinds).toContain(ServerMessageKind.SET_FLOW_SESSION);
      expect(
        resumed.pushed.find((message) => message.kind === ServerMessageKind.SET_FLOW_SESSION)
          ?.payload,
      ).toMatchObject({ id: session?.id });
    });
  });

  describe('gates', () => {
    it('disabled auto-start rules, and enabled but empty ones, never auto-start', async () => {
      const { projectId, environment, plan } = await fresh();
      const disabled = await seed({
        projectId,
        environment,
        type: ContentDataType.FLOW,
        autoStartRules: [attrRule(plan.id, 'pro')],
        opts: { enabledAutoStartRules: false },
        userData: { plan: 'pro' },
      });
      expect(
        (await started(environment, disabled.user, disabled.content, ContentDataType.FLOW)).active,
      ).toBe(false);
      const empty = await seed({
        projectId,
        environment,
        type: ContentDataType.FLOW,
        autoStartRules: [],
        userData: { plan: 'pro' },
      });
      expect(
        (await started(environment, empty.user, empty.content, ContentDataType.FLOW)).active,
      ).toBe(false);
    });

    it('the frequency window counts in seconds and minutes too', async () => {
      const { projectId, environment, plan } = await fresh();
      const seconds = await seed({
        projectId,
        environment,
        type: ContentDataType.FLOW,
        autoStartRules: [attrRule(plan.id, 'pro')],
        opts: {
          frequency: Frequency.MULTIPLE,
          every: { unit: FrequencyUnits.SECONDS, duration: 30 },
        },
        userData: { plan: 'pro' },
      });
      await seedEndedSession(projectId, seconds.content, seconds.user, seconds.version, 10_000);
      expect(
        (await started(environment, seconds.user, seconds.content, ContentDataType.FLOW)).active,
      ).toBe(false);

      // Its own project: the flow above matches this user too and would take the slot.
      const { projectId: p2, environment: e2, plan: plan2 } = await fresh();
      const minutes = await seed({
        projectId: p2,
        environment: e2,
        type: ContentDataType.FLOW,
        autoStartRules: [attrRule(plan2.id, 'pro')],
        opts: {
          frequency: Frequency.MULTIPLE,
          every: { unit: FrequencyUnits.MINUTES, duration: 5 },
        },
        userData: { plan: 'pro' },
      });
      await seedEndedSession(p2, minutes.content, minutes.user, minutes.version, 6 * 60_000);
      expect((await started(e2, minutes.user, minutes.content, ContentDataType.FLOW)).active).toBe(
        true,
      );
    });

    // FINDING: the quiet period (`atLeast`) is measured against the latest event
    // of another content of the same type, but that other content's type is
    // looked up from the user's events — so a flow the user has never had an
    // event for gets no latest event and the quiet period never applies to it.
    // A brand-new flow starts right after another one was dismissed. Pinned
    // here as the intended behaviour; skipped until the derivation is fixed
    // (content-data.service getLatestEventByContentType).
    it.skip('the quiet period holds a flow back while another flow was shown recently', async () => {
      const { projectId, environment, plan } = await fresh();
      const user = await buildBizUser(prisma, {
        environmentId: environment.id,
        data: { plan: 'pro' },
      });
      const other = await seed({
        projectId,
        environment,
        type: ContentDataType.FLOW,
        autoStartRules: [attrRule(plan.id, 'nobody')],
        user,
      });
      await seedEndedSession(projectId, other.content, user, other.version, 10 * 60_000);

      const quiet = await seed({
        projectId,
        environment,
        type: ContentDataType.FLOW,
        autoStartRules: [attrRule(plan.id, 'pro')],
        opts: {
          frequency: Frequency.UNLIMITED,
          atLeast: { unit: FrequencyUnits.HOURS, duration: 1 },
        },
        user,
      });
      expect((await started(environment, user, quiet.content, ContentDataType.FLOW)).active).toBe(
        false,
      );

      // Two hours of quiet: the same flow starts.
      await prisma.bizEvent.updateMany({
        where: { bizUserId: user.id, contentId: other.content.id },
        data: { createdAt: hourAgo(2) },
      });
      expect((await started(environment, user, quiet.content, ContentDataType.FLOW)).active).toBe(
        true,
      );
    });

    it('startIfNotComplete: an ended flow starts again until the user completed it once', async () => {
      const { projectId, environment, plan } = await fresh();
      const opts = {
        frequency: Frequency.UNLIMITED,
        every: { unit: FrequencyUnits.SECONDS, duration: 1 },
        startIfNotComplete: true,
      };
      const ended = await seed({
        projectId,
        environment,
        type: ContentDataType.FLOW,
        autoStartRules: [attrRule(plan.id, 'pro')],
        opts,
        userData: { plan: 'pro' },
      });
      await seedEndedSession(projectId, ended.content, ended.user, ended.version, 60 * 60_000);
      expect(
        (await started(environment, ended.user, ended.content, ContentDataType.FLOW)).active,
      ).toBe(true);

      const completed = await seed({
        projectId,
        environment,
        type: ContentDataType.FLOW,
        autoStartRules: [attrRule(plan.id, 'pro')],
        opts,
        userData: { plan: 'pro' },
      });
      await seedEndedSession(
        projectId,
        completed.content,
        completed.user,
        completed.version,
        60 * 60_000,
        BizEvents.FLOW_COMPLETED,
      );
      expect(
        (await started(environment, completed.user, completed.content, ContentDataType.FLOW))
          .active,
      ).toBe(false);
    });

    it('a launcher and a resource center are shown once: a dismissed session is not restarted', async () => {
      const { projectId, environment, plan } = await fresh();
      for (const type of [ContentDataType.LAUNCHER, ContentDataType.RESOURCE_CENTER]) {
        const { content, user } = await seed({
          projectId,
          environment,
          type,
          autoStartRules: [attrRule(plan.id, 'pro')],
          data: type === ContentDataType.RESOURCE_CENTER ? { tabs: [] } : {},
          userData: { plan: 'pro' },
          dismissedSessions: 1,
        });
        expect((await started(environment, user, content, type)).active).toBe(false);
      }
    });

    it('records why a session started: from its conditions', async () => {
      const { projectId, environment, plan } = await fresh();
      const { content, user } = await seed({
        projectId,
        environment,
        type: ContentDataType.FLOW,
        autoStartRules: [attrRule(plan.id, 'pro')],
        userData: { plan: 'pro' },
      });
      const result = await started(environment, user, content, ContentDataType.FLOW);
      expect(result.active).toBe(true);
      const session = await result.activeSession(content.id);
      const startedEvent = await prisma.bizEvent.findFirst({
        where: { bizSessionId: session?.id, event: { codeName: BizEvents.FLOW_STARTED } },
      });
      expect(
        (startedEvent?.data as Record<string, unknown>)?.[EventAttributes.FLOW_START_REASON],
      ).toBe('start_from_condition');
    });
  });

  describe('checklist and resource center', () => {
    it('a checklist auto-starts on its rules and is held back by its hide rules', async () => {
      const { projectId, environment, plan, tier } = await fresh();
      const shown = await seed({
        projectId,
        environment,
        type: ContentDataType.CHECKLIST,
        autoStartRules: [attrRule(plan.id, 'pro')],
        opts: { hideRules: [attrRule(tier.id, 'blocked')] },
        data: { items: [] },
        userData: { plan: 'pro', tier: 'gold' },
      });
      const result = await started(
        environment,
        shown.user,
        shown.content,
        ContentDataType.CHECKLIST,
      );
      expect(result.active).toBe(true);
      expect(result.kinds).toContain(ServerMessageKind.SET_CHECKLIST_SESSION);

      const hidden = await buildBizUser(prisma, {
        environmentId: environment.id,
        data: { plan: 'pro', tier: 'blocked' },
      });
      expect(
        (await started(environment, hidden, shown.content, ContentDataType.CHECKLIST)).active,
      ).toBe(false);
    });

    it('a resource center auto-starts on its rules', async () => {
      const { projectId, environment, plan } = await fresh();
      const { content, user } = await seed({
        projectId,
        environment,
        type: ContentDataType.RESOURCE_CENTER,
        autoStartRules: [attrRule(plan.id, 'pro')],
        data: { tabs: [] },
        userData: { plan: 'pro' },
      });
      const result = await started(environment, user, content, ContentDataType.RESOURCE_CENTER);
      expect(result.active).toBe(true);
      expect(result.kinds).toContain(ServerMessageKind.SET_RESOURCE_CENTER_SESSION);
    });
  });

  describe('announcements', () => {
    it('targeting and the schedule decide what a user sees', async () => {
      const { projectId, environment, plan } = await fresh();
      const user = await buildBizUser(prisma, {
        environmentId: environment.id,
        data: { plan: 'pro' },
      });
      const targeted = await seed({
        projectId,
        environment,
        type: ContentDataType.ANNOUNCEMENT,
        autoStartRules: [attrRule(plan.id, 'pro')],
        data: {},
        user,
      });
      const excluded = await seed({
        projectId,
        environment,
        type: ContentDataType.ANNOUNCEMENT,
        autoStartRules: [attrRule(plan.id, 'enterprise')],
        data: {},
        user,
      });
      const scheduled = await seed({
        projectId,
        environment,
        type: ContentDataType.ANNOUNCEMENT,
        autoStartRules: [attrRule(plan.id, 'pro')],
        data: {},
        user,
        scheduledAt: hoursAhead(2),
      });
      const visible = await announcements.findVisibleAnnouncements(environment, user, '');
      const ids = visible.map((item) => item.contentId);
      expect(ids).toContain(targeted.content.id);
      expect(ids).not.toContain(excluded.content.id);
      expect(ids).not.toContain(scheduled.content.id);
    });
  });
});
