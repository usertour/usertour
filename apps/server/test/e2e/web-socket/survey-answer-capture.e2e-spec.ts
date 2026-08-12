import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { AttributeBizTypes, AttributeDataType, BizEvents } from '@usertour/types';

import { compileContent } from '@/api/content-representation/representation.compile';
import type { CompileResolvers } from '@/api/content-representation/rules.compile';
import { extractQuestionData } from '@/utils/content-question';
import { EventTrackingService } from '@/web-socket/core/event-tracking.service';
import { createTestApp } from '../create-test-app';
import {
  buildAttribute,
  buildBizUser,
  buildContent,
  buildEnvironment,
  buildEvent,
  buildProject,
  buildSession,
  buildStep,
  buildTheme,
  buildVersion,
} from '../factories';

/**
 * End-to-end capture: when a survey question is answered, the runtime
 * (web-socket-v2 answerQuestion → event-tracking handleQuestionAnswered) must
 * record the answer AND, when the question binds an attribute, write that answer
 * onto the user. Verified by hand in the survey eval; this codifies it — number /
 * list binds, and that an unbound question writes no attribute.
 */
const ids: CompileResolvers = { attributeId: (c) => c, eventId: (c) => c };

describe('survey answer capture (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let events: EventTrackingService;
  let projectId: string;
  let environmentId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    events = app.get(EventTrackingService);

    const project = await buildProject(prisma);
    projectId = project.id;
    const env = await buildEnvironment(prisma, { projectId });
    environmentId = env.id;
    // The predefined event the answer is tracked under. Its answer attributes must
    // be attached, or filterEventDataByAttributes drops every field and no answer
    // event/row is recorded (the binding still happens — it reads unfiltered data).
    const qaEvent = await buildEvent(prisma, {
      projectId,
      codeName: BizEvents.QUESTION_ANSWERED,
      predefined: true,
    });
    for (const codeName of [
      'question_cvid',
      'question_name',
      'question_type',
      'number_answer',
      'text_answer',
      'list_answer',
    ]) {
      const a = await buildAttribute(prisma, {
        projectId,
        codeName,
        displayName: codeName,
        dataType: AttributeDataType.String,
        bizType: AttributeBizTypes.Event,
      });
      await prisma.attributeOnEvent.create({ data: { eventId: qaEvent.id, attributeId: a.id } });
    }
    await buildAttribute(prisma, {
      projectId,
      codeName: 'nps_score',
      displayName: 'NPS',
      dataType: AttributeDataType.Number,
      bizType: AttributeBizTypes.User,
    });
    await buildAttribute(prisma, {
      projectId,
      codeName: 'roles',
      displayName: 'Roles',
      dataType: AttributeDataType.List,
      bizType: AttributeBizTypes.User,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // Build a published-shaped flow whose single step holds one question, seed a
  // session for a fresh user, and return the session + the compiled question cvid.
  const seed = async (question: Record<string, unknown>) => {
    const content = await buildContent(prisma, { projectId, type: 'flow' });
    const theme = await buildTheme(prisma, { projectId });
    const version = await buildVersion(prisma, { contentId: content.id, themeId: theme.id });
    const data = compileContent([{ type: 'question', question } as never], undefined, ids);
    await buildStep(prisma, {
      versionId: version.id,
      type: 'modal',
      sequence: 0,
      data: data as never,
    });
    const cvid = (extractQuestionData(data as never)[0]?.data as { cvid?: string })?.cvid as string;
    const bizUser = await buildBizUser(prisma, { environmentId });
    const session = await buildSession(prisma, {
      bizUserId: bizUser.id,
      versionId: version.id,
      contentId: content.id,
    });
    return { session, cvid, bizUser };
  };

  const clientContext = {
    pageUrl: 'http://app/',
    viewportWidth: 1280,
    viewportHeight: 800,
  } as never;
  const env = () => ({ id: environmentId, projectId }) as never;

  it('binds a number answer (nps) onto the user and records the response', async () => {
    const { session, cvid, bizUser } = await seed({
      kind: 'nps',
      name: 'NPS',
      bindAttribute: 'nps_score',
    });

    const ok = await events.trackEventByType(BizEvents.QUESTION_ANSWERED, {
      sessionId: session.id,
      environment: env(),
      clientContext,
      answer: {
        questionCvid: cvid,
        questionName: 'NPS',
        questionType: 'nps',
        numberAnswer: 9,
      } as never,
    });
    expect(ok).toBe(true);

    const user = await prisma.bizUser.findUnique({ where: { id: bizUser.id } });
    expect((user?.data as Record<string, unknown>)?.nps_score).toBe(9);
    const answer = await prisma.bizAnswer.findFirst({ where: { bizSessionId: session.id } });
    expect(answer).toBeTruthy();
  });

  it('binds a list answer (multi-choice) onto the user', async () => {
    const { session, cvid, bizUser } = await seed({
      kind: 'choice',
      name: 'Roles',
      allowMultiple: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Dev', value: 'developer' },
      ],
      bindAttribute: 'roles',
    });

    await events.trackEventByType(BizEvents.QUESTION_ANSWERED, {
      sessionId: session.id,
      environment: env(),
      clientContext,
      answer: {
        questionCvid: cvid,
        questionName: 'Roles',
        questionType: 'multiple-choice',
        listAnswer: ['admin', 'developer'],
      } as never,
    });

    const user = await prisma.bizUser.findUnique({ where: { id: bizUser.id } });
    expect((user?.data as Record<string, unknown>)?.roles).toEqual(['admin', 'developer']);
  });

  it('records an unbound question as a response but writes no attribute', async () => {
    const { session, cvid, bizUser } = await seed({ kind: 'text', name: 'Free', multiline: true });

    await events.trackEventByType(BizEvents.QUESTION_ANSWERED, {
      sessionId: session.id,
      environment: env(),
      clientContext,
      answer: {
        questionCvid: cvid,
        questionName: 'Free',
        questionType: 'multi-line-text',
        textAnswer: 'hello',
      } as never,
    });

    const user = await prisma.bizUser.findUnique({ where: { id: bizUser.id } });
    expect(Object.keys((user?.data as Record<string, unknown>) ?? {})).not.toContain('nps_score');
    const answer = await prisma.bizAnswer.findFirst({ where: { bizSessionId: session.id } });
    expect(answer).toBeTruthy();
  });
});
