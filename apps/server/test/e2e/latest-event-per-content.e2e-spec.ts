import { INestApplication } from '@nestjs/common';
import { BizEvents, ContentDataType } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import { ContentDataService } from '@/modules/delivery/services/content-data.service';
import type { ContentSessionCollection } from '@/modules/delivery/types/content-session-collection.type';
import { DISMISSED_EVENTS } from '@/modules/delivery/utils/event.util';
import { createTestApp } from './create-test-app';
import {
  buildBizUser,
  buildContent,
  buildEnvironment,
  buildEvent,
  buildProject,
  buildSession,
  buildVersion,
} from './factories';
import { teardownProject } from './gql/_support';

type ContentRef = { id: string; type: ContentDataType };
type SessionFanOut = {
  findSessionsFromDB: (
    contents: ContentRef[],
    bizUserId: string,
  ) => Promise<Map<string, ContentSessionCollection>>;
};

/**
 * Pins the two rows per content the frequency rules read — the user's newest
 * event on a sibling content of the same type (the quiet period measures from
 * it) and the newest dismissed event on the content itself (the `every`
 * period measures from it). The database now picks those rows instead of the
 * service loading the user's whole history, so the answer is checked against
 * a brute-force pass over that history: the same contract as before, for a
 * user whose history also holds a deleted session, an event without a
 * session, and another user's events on the same contents — none of which
 * may take part.
 */
describe('Session fan-out: newest events per content (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let fanOut: SessionFanOut;
  let projectId: string;
  let bizUserId: string;
  let flowA: ContentRef;
  let flowB: ContentRef;
  let checklistC: ContentRef;
  const eventIdByLabel = new Map<string, string>();

  // Explicit timestamps, so the order never depends on insertion order.
  const minute = (n: number) => new Date(Date.UTC(2026, 0, 1, 0, n));

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    fanOut = app.get(ContentDataService) as unknown as SessionFanOut;

    projectId = (await buildProject(prisma, { name: 'latest-event-per-content' })).id;
    const environmentId = (await buildEnvironment(prisma, { projectId })).id;
    bizUserId = (await buildBizUser(prisma, { environmentId })).id;
    const otherBizUserId = (await buildBizUser(prisma, { environmentId })).id;

    const definitionIdByCode = new Map<string, string>();
    for (const codeName of [
      BizEvents.FLOW_STARTED,
      BizEvents.FLOW_ENDED,
      BizEvents.FLOW_STEP_SEEN,
      BizEvents.CHECKLIST_STARTED,
      BizEvents.CHECKLIST_DISMISSED,
    ]) {
      const definition = await buildEvent(prisma, { projectId, codeName, displayName: codeName });
      definitionIdByCode.set(codeName, definition.id);
    }

    const buildTypedContent = async (type: ContentDataType): Promise<ContentRef> => {
      const content = await buildContent(prisma, { projectId, environmentId, type });
      await buildVersion(prisma, { contentId: content.id });
      return { id: content.id, type };
    };
    flowA = await buildTypedContent(ContentDataType.FLOW);
    flowB = await buildTypedContent(ContentDataType.FLOW);
    checklistC = await buildTypedContent(ContentDataType.CHECKLIST);

    const session = async (content: ContentRef, overrides: { deleted?: boolean } = {}) => {
      const version = await prisma.version.findFirstOrThrow({ where: { contentId: content.id } });
      return buildSession(prisma, {
        bizUserId,
        contentId: content.id,
        versionId: version.id,
        environmentId,
        projectId,
        ...overrides,
      });
    };
    const track = async (
      label: string,
      codeName: BizEvents,
      at: Date,
      params: { bizSessionId: string | null; bizUserId?: string },
    ) => {
      const event = await prisma.bizEvent.create({
        data: {
          bizUserId: params.bizUserId ?? bizUserId,
          bizSessionId: params.bizSessionId,
          eventId: definitionIdByCode.get(codeName) as string,
          createdAt: at,
        },
      });
      eventIdByLabel.set(label, event.id);
    };

    // flowA: an ended session, then a still-active one.
    const flowAFirst = await session(flowA);
    await track('flowA.started.1', BizEvents.FLOW_STARTED, minute(1), {
      bizSessionId: flowAFirst.id,
    });
    await track('flowA.ended.1', BizEvents.FLOW_ENDED, minute(2), { bizSessionId: flowAFirst.id });
    const flowBFirst = await session(flowB);
    await track('flowB.started.1', BizEvents.FLOW_STARTED, minute(3), {
      bizSessionId: flowBFirst.id,
    });
    await track('flowB.ended.1', BizEvents.FLOW_ENDED, minute(4), { bizSessionId: flowBFirst.id });
    const flowASecond = await session(flowA);
    await track('flowA.started.2', BizEvents.FLOW_STARTED, minute(5), {
      bizSessionId: flowASecond.id,
    });

    // checklistC: one dismissed session, and a later one marked deleted.
    const checklistFirst = await session(checklistC);
    await track('checklistC.started.1', BizEvents.CHECKLIST_STARTED, minute(6), {
      bizSessionId: checklistFirst.id,
    });
    await track('checklistC.dismissed.1', BizEvents.CHECKLIST_DISMISSED, minute(7), {
      bizSessionId: checklistFirst.id,
    });
    const checklistDeleted = await session(checklistC, { deleted: true });
    await track('checklistC.dismissed.deleted', BizEvents.CHECKLIST_DISMISSED, minute(9), {
      bizSessionId: checklistDeleted.id,
    });

    // Rows that must not take part: an event without a session, and another
    // user's newer events on the same contents.
    await track('noSession', BizEvents.FLOW_STEP_SEEN, minute(10), { bizSessionId: null });
    const otherUsersSession = await buildSession(prisma, {
      bizUserId: otherBizUserId,
      contentId: flowB.id,
      versionId: flowBFirst.versionId,
      environmentId,
      projectId,
    });
    await track('otherUser.flowB.ended', BizEvents.FLOW_ENDED, minute(11), {
      bizSessionId: otherUsersSession.id,
      bizUserId: otherBizUserId,
    });
  });

  afterAll(async () => {
    if (prisma) {
      await teardownProject(prisma, projectId);
    }
    await app?.close();
  });

  const idOf = (label: string) => eventIdByLabel.get(label);

  it('picks the newest sibling event and the newest dismissed event per content', async () => {
    const collections = await fanOut.findSessionsFromDB([flowA, flowB, checklistC], bizUserId);

    expect(collections.get(flowA.id)?.latestSiblingEvent?.id).toBe(idOf('flowB.ended.1'));
    expect(collections.get(flowA.id)?.latestDismissedEvent?.id).toBe(idOf('flowA.ended.1'));

    expect(collections.get(flowB.id)?.latestSiblingEvent?.id).toBe(idOf('flowA.started.2'));
    expect(collections.get(flowB.id)?.latestDismissedEvent?.id).toBe(idOf('flowB.ended.1'));

    // No other checklist, so no sibling; the deleted session's dismissal is skipped.
    expect(collections.get(checklistC.id)?.latestSiblingEvent).toBeUndefined();
    expect(collections.get(checklistC.id)?.latestDismissedEvent?.id).toBe(
      idOf('checklistC.dismissed.1'),
    );
  });

  it('agrees with a brute-force pass over the whole history', async () => {
    const contents = [flowA, flowB, checklistC];
    const history = await prisma.bizEvent.findMany({
      where: {
        bizUserId,
        bizSession: { contentId: { in: contents.map((content) => content.id) }, deleted: false },
      },
      include: { event: true, bizSession: { select: { contentId: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const typeOf = new Map(contents.map((content) => [content.id, content.type]));

    const collections = await fanOut.findSessionsFromDB(contents, bizUserId);
    for (const content of contents) {
      const sibling = history.find(
        (event) =>
          event.bizSession?.contentId !== content.id &&
          typeOf.get(event.bizSession?.contentId ?? '') === content.type,
      );
      const dismissed = history.find(
        (event) =>
          event.bizSession?.contentId === content.id &&
          (DISMISSED_EVENTS as readonly string[]).includes(event.event.codeName),
      );
      expect(collections.get(content.id)?.latestSiblingEvent?.id).toBe(sibling?.id);
      expect(collections.get(content.id)?.latestDismissedEvent?.id).toBe(dismissed?.id);
    }
  });

  it('counts sessions as before', async () => {
    const collections = await fanOut.findSessionsFromDB([flowA, checklistC], bizUserId);

    expect(collections.get(flowA.id)?.totalSessions).toBe(2);
    expect(collections.get(flowA.id)?.activeSession?.id).toBeDefined();
    expect(collections.get(checklistC.id)?.totalSessions).toBe(1);
  });
});
