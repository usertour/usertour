import { INestApplication } from '@nestjs/common';
import { Capability, ContentEditorElementType } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import {
  buildBizUser,
  buildContent,
  buildEnvironment,
  buildProject,
  buildSession,
  buildStep,
  buildVersion,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/**
 * Shape contract for the v2 content-sessions endpoints. Sessions are an
 * environment-level collection (a session's owner is the environment); contentId
 * and userId are optional filters, not path segments. Its embedded content is the
 * A-shape lightweight reference (no publish state), so this is a shape test rather
 * than a v1 parity test.
 */
describe('API v2 /sessions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectId: string;
  let environmentId: string;
  let contentId: string;
  let sessionId: string;
  // A second content + session in the same environment, to prove cross-content listing.
  let otherContentId: string;
  let otherSessionId: string;
  // A survey session with real answers, to prove typed answerValue on expand=answers.
  let surveySessionId: string;
  const userExternalId = 'bu-session-jane';

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  async function mint(scopes: Capability[], environmentIds?: string[]): Promise<string> {
    const res = await graphql(app, {
      query: CREATE,
      variables: {
        // Env-targeted scopes must NAME environments (server rule) — default to the suite env.
        input: {
          name: 'k',
          scopes,
          projectIds: [projectId],
          environmentIds: environmentIds ?? [environmentId],
        },
      },
      token: ownerToken,
    });
    return gqlData(res).createApiToken.token;
  }

  function base(suffix = ''): string {
    return `/v2/projects/${projectId}/environments/${environmentId}/sessions${suffix}`;
  }
  function api(method: 'get' | 'post', path: string, token?: string) {
    const req = request(app.getHttpServer())[method](path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'api-v2-sessions' })).id;
    environmentId = (await buildEnvironment(prisma, { projectId })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;

    const content = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
    contentId = content.id;
    const versionId = (await buildVersion(prisma, { contentId, sequence: 0 })).id;
    const bizUser = await buildBizUser(prisma, {
      environmentId,
      externalId: userExternalId,
      data: { name: 'Jane' },
    });
    const session = await buildSession(prisma, {
      bizUserId: bizUser.id,
      contentId,
      versionId,
      environmentId,
      projectId,
    });
    sessionId = session.id;

    const otherContent = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
    otherContentId = otherContent.id;
    const otherVersionId = (await buildVersion(prisma, { contentId: otherContentId, sequence: 0 }))
      .id;
    const otherSession = await buildSession(prisma, {
      bizUserId: bizUser.id,
      contentId: otherContentId,
      versionId: otherVersionId,
      environmentId,
      projectId,
    });
    otherSessionId = otherSession.id;

    // A survey (a flow with question steps) + a session carrying real answers, so
    // the answers expand can prove each value comes back in its true type. Two
    // question steps: an NPS (number) and a multiple-choice (string array).
    const survey = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
    const surveyVersionId = (await buildVersion(prisma, { contentId: survey.id, sequence: 0 })).id;
    await buildStep(prisma, {
      versionId: surveyVersionId,
      sequence: 0,
      data: [
        {
          element: {
            type: ContentEditorElementType.NPS,
            data: { cvid: 'q_nps', name: 'How likely?' },
          },
        },
      ] as unknown as object,
    });
    await buildStep(prisma, {
      versionId: surveyVersionId,
      sequence: 1,
      data: [
        {
          element: {
            type: ContentEditorElementType.MULTIPLE_CHOICE,
            data: { cvid: 'q_mc', name: 'Which channels?' },
          },
        },
      ] as unknown as object,
    });
    const surveySession = await buildSession(prisma, {
      bizUserId: bizUser.id,
      contentId: survey.id,
      versionId: surveyVersionId,
      environmentId,
      projectId,
    });
    surveySessionId = surveySession.id;
    // BizAnswer has no Prisma-level FK relations — plain columns — so the rows can
    // be written directly. bizEventId is a bare column here (no event needed).
    await prisma.bizAnswer.createMany({
      data: [
        {
          bizEventId: `evt-${surveySession.id}-nps`,
          bizSessionId: surveySession.id,
          contentId: survey.id,
          versionId: surveyVersionId,
          bizUserId: bizUser.id,
          environmentId,
          cvid: 'q_nps',
          numberAnswer: 9,
        },
        {
          bizEventId: `evt-${surveySession.id}-mc`,
          bizSessionId: surveySession.id,
          contentId: survey.id,
          versionId: surveyVersionId,
          bizUserId: bizUser.id,
          environmentId,
          cvid: 'q_mc',
          listAnswer: ['email', 'docs'],
        },
      ],
    });
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.apiToken.deleteMany({ where: { userId: ownerUserId } });
      await prisma.userOnProject.deleteMany({ where: { projectId } });
      await teardownProject(prisma, projectId);
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
    }
    await app?.close();
  });

  it('gets a session by id (embeds null without expand)', async () => {
    const token = await mint([Capability.SessionRead]);
    const res = await api('get', base(`/${sessionId}`), token);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: sessionId,
      object: 'contentSession',
      contentId,
      userId: userExternalId,
    });
    expect(res.body.content).toBeNull();
    expect(res.body.user).toBeNull();
    expect(res.body.answers).toBeNull();
  });

  it('embeds the A-shape content on expand=content (no publish state)', async () => {
    const token = await mint([Capability.SessionRead]);
    const res = await api('get', base(`/${sessionId}?expand=content`), token);
    expect(res.status).toBe(200);
    expect(res.body.content).toMatchObject({ id: contentId, object: 'content', type: 'flow' });
    expect(res.body.content).toHaveProperty('editedVersionId');
    expect(res.body.content).not.toHaveProperty('publishedVersionId');
    expect(res.body.content).not.toHaveProperty('environments');
  });

  it('embeds the user on expand=user', async () => {
    const token = await mint([Capability.SessionRead]);
    const res = await api('get', base(`/${sessionId}?expand=user`), token);
    expect(res.body.user).toMatchObject({ id: userExternalId, object: 'user' });
  });

  it('answers come back in their real type on expand=answers (number, array)', async () => {
    const token = await mint([Capability.SessionRead]);
    const res = await api('get', base(`/${surveySessionId}?expand=answers`), token);
    expect(res.status).toBe(200);
    const answers = res.body.answers as { answerType: string; answerValue: unknown }[];
    const nps = answers.find((a) => a.answerType === 'nps');
    const mc = answers.find((a) => a.answerType === 'multiple-choice');
    // NPS is a number, not the string "9".
    expect(nps?.answerValue).toBe(9);
    expect(typeof nps?.answerValue).toBe('number');
    // Multiple-choice is the option array, not a JSON-encoded string.
    expect(Array.isArray(mc?.answerValue)).toBe(true);
    expect(mc?.answerValue).toEqual(['email', 'docs']);
  });

  it('lists all sessions in the environment (across content)', async () => {
    const token = await mint([Capability.SessionRead]);
    const res = await api('get', base(), token);
    expect(res.status).toBe(200);
    const ids = res.body.results.map((s: { id: string }) => s.id);
    expect(ids).toEqual(expect.arrayContaining([sessionId, otherSessionId]));
  });

  it('filters sessions by contentId', async () => {
    const token = await mint([Capability.SessionRead]);
    const res = await api('get', base(`?contentId=${contentId}`), token);
    expect(res.status).toBe(200);
    const ids = res.body.results.map((s: { id: string }) => s.id);
    expect(ids).toContain(sessionId);
    expect(ids).not.toContain(otherSessionId);
  });

  it('filters sessions by userId', async () => {
    const token = await mint([Capability.SessionRead]);
    const res = await api('get', base(`?userId=${userExternalId}`), token);
    expect(res.status).toBe(200);
    expect(res.body.results.map((s: { id: string }) => s.id)).toContain(sessionId);
  });

  it('ending an already-ended session is idempotent 200, never E1005 (the session EXISTS)', async () => {
    // Domain endSession returns one `false` for missing / already-ended /
    // no-end-semantics; the blanket E1005 lied for the last two (console
    // sweep, sessions group). Ended -> return as-is, same idempotent family
    // as unpublishing an unpublished environment.
    const token = await mint([Capability.SessionRead, Capability.SessionManage]);
    const flow = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
    const fv = await buildVersion(prisma, { contentId: flow.id, sequence: 0 });
    const ended = await buildSession(prisma, {
      bizUserId: (await buildBizUser(prisma, { environmentId })).id,
      contentId: flow.id,
      versionId: fv.id,
      environmentId,
      projectId,
      state: 1,
    });
    const res = await api('post', `${base()}/${ended.id}/end`, token);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ended.id);

    // A tracker session has no end semantics — explicit 400, not "not found".
    const tracker = await buildContent(prisma, { projectId, environmentId, type: 'tracker' });
    const tv = await buildVersion(prisma, { contentId: tracker.id, sequence: 0 });
    const trackerSession = await buildSession(prisma, {
      bizUserId: (await buildBizUser(prisma, { environmentId })).id,
      contentId: tracker.id,
      versionId: tv.id,
      environmentId,
      projectId,
    });
    const t = await api('post', `${base()}/${trackerSession.id}/end`, token);
    expect(t.status).toBe(400);
    expect(t.body.error.code).toBe('E1017');
    expect(t.body.error.message).toContain('cannot be ended');
  });

  it('returns 404 for an unknown session (E1005)', async () => {
    const token = await mint([Capability.SessionRead]);
    const res = await api('get', base('/nope'), token);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1005');
  });

  it('returns 404 filtering by an unknown contentId (E1004)', async () => {
    const token = await mint([Capability.SessionRead]);
    const res = await api('get', base('?contentId=nope'), token);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1004');
  });

  it('rejects insufficient scope (403 E1012)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', base(), token);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });

  const send = (method: 'post' | 'delete', path: string, token: string) =>
    request(app.getHttpServer())[method](base(path)).set('Authorization', `Bearer ${token}`);

  it('end rejects a token without session:manage (403 E1012)', async () => {
    const token = await mint([Capability.SessionRead]);
    const res = await send('post', `/${sessionId}/end`, token);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });

  // NOTE: happy-path end isn't asserted here — like the v1 suite, ending a flow
  // session needs the project's default flow event definitions + a prior
  // step-seen event seeded (endFlowSession reads them), which the bare test
  // fixture doesn't set up. The guard + not-found paths are covered instead.
  it('end 404 for an unknown session (E1005)', async () => {
    const token = await mint([Capability.SessionManage]);
    const res = await send('post', '/nope/end', token);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1005');
  });

  it('delete 404 for an unknown session (E1005)', async () => {
    const token = await mint([Capability.SessionManage]);
    const res = await send('delete', '/nope', token);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1005');
  });

  it('deletes a session (204), then it is gone (404)', async () => {
    const token = await mint([Capability.SessionManage, Capability.SessionRead]);
    expect((await send('delete', `/${sessionId}`, token)).status).toBe(204);
    const after = await api('get', base(`/${sessionId}`), token);
    expect(after.status).toBe(404);
  });
});
