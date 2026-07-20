import { PrismaService } from 'nestjs-prisma';
import { ClientMessageKind, ServerMessageKind } from '@usertour/types';

import { initialization } from '@/common/initialization/initialization';
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
 * Checklist message kinds (ClickChecklistTask / HideChecklist /
 * ShowChecklist) plus AnswerQuestion, over a real socket.io connection.
 * Checklist state transitions are event-sourced — every kind here is a
 * tracking wrapper — so assertions land on the BizEvent rows (and their
 * event-data payloads), not just on acks.
 */
describe('WebSocket v2 checklist and question messages (e2e)', () => {
  let harness: WebSocketTestApp;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let environmentToken: string;
  let client: WebSocketTestClient;

  const externalUserId = `ws-checklist-user-${Date.now()}`;

  let checklistContentId: string;
  let checklistSessionId: string;
  let flowContentId: string;
  let flowSessionId: string;

  const checklistItem = (id: string, name: string) => ({
    id,
    name,
    isCompleted: false,
    clickedActions: [],
    completeConditions: [],
    onlyShowTask: false,
    onlyShowTaskConditions: [],
  });

  beforeAll(async () => {
    harness = await createWebSocketTestApp();
    prisma = harness.app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'ws-checklist' });
    projectId = project.id;
    await initialization(prisma, projectId);
    const environment = await buildEnvironment(prisma, { projectId, isPrimary: true });
    environmentId = environment.id;
    environmentToken = environment.token;

    const checklistContent = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'ws-checklist',
      type: 'checklist',
    });
    checklistContentId = checklistContent.id;
    const checklistVersion = await buildVersion(prisma, {
      contentId: checklistContent.id,
      sequence: 1,
      config: {},
      data: {
        buttonText: 'Get started',
        initialDisplay: 'expanded',
        completionOrder: 'any',
        preventDismissChecklist: false,
        autoDismissChecklist: false,
        items: [checklistItem('task-1', 'Task One'), checklistItem('task-2', 'Task Two')],
        content: [],
      },
    });
    await publishVersion(prisma, {
      environmentId,
      contentId: checklistContent.id,
      versionId: checklistVersion.id,
    });

    // A flow session to carry the question answer — AnswerQuestion is
    // session-scoped, not content-type-scoped.
    const flowContent = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'ws-question-flow',
      type: 'flow',
    });
    flowContentId = flowContent.id;
    const flowVersion = await buildVersion(prisma, {
      contentId: flowContent.id,
      sequence: 1,
      config: {},
      data: [],
    });
    await buildStep(prisma, {
      versionId: flowVersion.id,
      sequence: 0,
      name: 'Question Step',
      data: [],
    });
    await publishVersion(prisma, {
      environmentId,
      contentId: flowContent.id,
      versionId: flowVersion.id,
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

  const findSessionEvent = (sessionId: string, codeName: string) =>
    prisma.bizEvent.findFirst({
      where: { bizSessionId: sessionId, event: { codeName } },
    });

  it('StartContent opens a checklist session and emits SetChecklistSession', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: checklistContentId,
      startReason: 'start_from_manual',
    });
    expect(ack).toBe(true);
    await client.waitForServerMessage(ServerMessageKind.SET_CHECKLIST_SESSION);

    const bizSession = await prisma.bizSession.findFirst({
      where: {
        contentId: checklistContentId,
        bizUser: { externalId: externalUserId, environmentId },
        deleted: false,
        state: 0,
      },
    });
    expect(bizSession).not.toBeNull();
    checklistSessionId = bizSession?.id as string;

    const startedEvent = await findSessionEvent(checklistSessionId, 'checklist_started');
    expect(startedEvent).not.toBeNull();
  });

  it('ClickChecklistTask records checklist_task_clicked with the task id', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.CLICK_CHECKLIST_TASK, {
      sessionId: checklistSessionId,
      taskId: 'task-1',
    });
    expect(ack).toBe(true);

    const clickedEvent = await findSessionEvent(checklistSessionId, 'checklist_task_clicked');
    expect(clickedEvent).not.toBeNull();
    expect((clickedEvent?.data as Record<string, unknown>).checklist_task_id).toBe('task-1');
  });

  it('HideChecklist records checklist_hidden', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.HIDE_CHECKLIST, {
      sessionId: checklistSessionId,
    });
    expect(ack).toBe(true);

    const hiddenEvent = await findSessionEvent(checklistSessionId, 'checklist_hidden');
    expect(hiddenEvent).not.toBeNull();
  });

  it('ShowChecklist records checklist_seen', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.SHOW_CHECKLIST, {
      sessionId: checklistSessionId,
    });
    expect(ack).toBe(true);

    const seenEvent = await findSessionEvent(checklistSessionId, 'checklist_seen');
    expect(seenEvent).not.toBeNull();
  });

  it('EndContent dismisses the checklist session', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.END_CONTENT, {
      sessionId: checklistSessionId,
      endReason: 'user_closed',
    });
    expect(ack).toBe(true);

    const endedSession = await prisma.bizSession.findUnique({
      where: { id: checklistSessionId },
    });
    expect(endedSession?.state).not.toBe(0);

    const dismissedEvent = await findSessionEvent(checklistSessionId, 'checklist_dismissed');
    expect(dismissedEvent).not.toBeNull();
  });

  it('AnswerQuestion records question_answered with the answer payload', async () => {
    const startAck = await client.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: flowContentId,
      startReason: 'start_from_manual',
    });
    expect(startAck).toBe(true);
    const flowSession = await prisma.bizSession.findFirst({
      where: {
        contentId: flowContentId,
        bizUser: { externalId: externalUserId, environmentId },
        deleted: false,
        state: 0,
      },
    });
    expect(flowSession).not.toBeNull();
    flowSessionId = flowSession?.id as string;

    const ack = await client.sendClientMessage(ClientMessageKind.ANSWER_QUESTION, {
      sessionId: flowSessionId,
      questionCvid: 'question-1',
      questionName: 'How likely are you to recommend us?',
      questionType: 'nps',
      numberAnswer: 9,
    });
    expect(ack).toBe(true);

    const answeredEvent = await findSessionEvent(flowSessionId, 'question_answered');
    expect(answeredEvent).not.toBeNull();
    const eventData = answeredEvent?.data as Record<string, unknown>;
    expect(eventData.question_cvid).toBe('question-1');
    expect(eventData.number_answer).toBe(9);
  });
});
