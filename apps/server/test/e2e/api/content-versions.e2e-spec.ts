import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import {
  buildContent,
  buildEnvironment,
  buildProject,
  buildStep,
  buildVersion,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/** Contract test for the v2 content-versions endpoints (list/get + questions expand). */
describe('API v2 /content-versions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectId: string;
  let contentId: string;
  let versionId: string;

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  async function mint(scopes: Capability[]): Promise<string> {
    const res = await graphql(app, {
      query: CREATE,
      variables: { input: { name: 'k', scopes, projectIds: [projectId] } },
      token: ownerToken,
    });
    return gqlData(res).createApiToken.token;
  }

  function api(method: 'get', path: string, token?: string) {
    const req = request(app.getHttpServer())[method](path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'api-v2-versions' })).id;
    const environmentId = (await buildEnvironment(prisma, { projectId })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;

    const content = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
    contentId = content.id;
    versionId = (
      await buildVersion(prisma, {
        contentId,
        sequence: 0,
        config: {
          enabledAutoStartRules: true,
          autoStartRules: [{ type: 'current-page', data: { includes: ['/app/*'] } }],
          autoStartRulesSetting: { frequency: { frequency: 'once' }, priority: 'medium' },
        },
      })
    ).id;
    await buildStep(prisma, {
      versionId,
      type: 'tooltip',
      name: 'Step one',
      cvid: 'cv-1',
      sequence: 0,
      trigger: [{ conditions: [], actions: [{ type: 'flow-dismis', data: {} }], wait: 0 }],
      data: [
        {
          element: { type: 'group' },
          children: [
            {
              element: { type: 'column' },
              children: [
                {
                  element: {
                    type: 'text',
                    data: [{ type: 'paragraph', children: [{ text: 'Hello' }] }],
                  },
                },
                { element: { type: 'button', data: { text: 'Next', type: 'primary' } } },
              ],
            },
          ],
        },
      ],
      target: { type: 'manual', customSelector: '.cta' },
      setting: { side: 'bottom', align: 'center', width: 320 },
    });
    await buildStep(prisma, {
      versionId,
      type: 'modal',
      name: 'Step two',
      cvid: 'cv-2',
      sequence: 1,
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

  it('gets a content version by id (questions null without expand)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', `/v2/projects/${projectId}/content-versions/${versionId}`, token);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: versionId, object: 'contentVersion', number: 0 });
    expect(res.body.questions).toBeNull();
  });

  it('lists versions for a content', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(
      'get',
      `/v2/projects/${projectId}/content-versions?contentId=${contentId}`,
      token,
    );
    expect(res.status).toBe(200);
    expect(res.body.results.map((v: { id: string }) => v.id)).toContain(versionId);
  });

  it('exposes themeId on a version (null when no theme)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', `/v2/projects/${projectId}/content-versions/${versionId}`, token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('themeId');
  });

  it('decompiles slim authoring steps with expand=steps (ordered by sequence)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(
      'get',
      `/v2/projects/${projectId}/content-versions/${versionId}?expand=steps`,
      token,
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.steps)).toBe(true);
    expect(res.body.steps).toHaveLength(2);
    expect(res.body.steps[0]).toMatchObject({
      object: 'step',
      cvid: 'cv-1',
      name: 'Step one',
      type: 'tooltip',
      sequence: 0,
    });
    expect(res.body.steps[1].sequence).toBe(1);
  });

  it('decompiles step body, target, and placement (expand=steps)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(
      'get',
      `/v2/projects/${projectId}/content-versions/${versionId}?expand=steps`,
      token,
    );
    expect(res.status).toBe(200);
    const step = res.body.steps.find((s: { cvid: string }) => s.cvid === 'cv-1');
    expect(step.target).toEqual({ by: 'selector', selector: '.cta' });
    expect(step.placement).toMatchObject({ side: 'bottom', align: 'center' });
    expect(step.width).toBe(320);
    expect(step.content).toEqual([
      { object: 'block', type: 'text', markdown: 'Hello' },
      { object: 'block', type: 'button', text: 'Next', variant: 'primary' },
    ]);
  });

  it('decompiles version start rules from config', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', `/v2/projects/${projectId}/content-versions/${versionId}`, token);
    expect(res.status).toBe(200);
    expect(res.body.startRules).toMatchObject({
      when: [{ type: 'current_url', includes: ['/app/*'] }],
      frequency: { mode: 'once' },
      priority: 'medium',
    });
    expect(res.body.hideRules).toBeUndefined();
  });

  it('decompiles step triggers (conditions → actions)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(
      'get',
      `/v2/projects/${projectId}/content-versions/${versionId}?expand=steps`,
      token,
    );
    const step = res.body.steps.find((s: { cvid: string }) => s.cvid === 'cv-1');
    expect(step.triggers).toEqual([{ do: [{ type: 'dismiss' }], waitMs: 0 }]);
  });

  it('omits steps without the expand', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', `/v2/projects/${projectId}/content-versions/${versionId}`, token);
    expect(res.body.steps).toBeUndefined();
  });

  it('returns questions as an array when expanded', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(
      'get',
      `/v2/projects/${projectId}/content-versions/${versionId}?expand=questions`,
      token,
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.questions)).toBe(true);
  });

  it('returns 404 for an unknown version (E1004)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', `/v2/projects/${projectId}/content-versions/nope`, token);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1004');
  });

  it('returns 404 listing versions for an unknown content (E1004)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(
      'get',
      `/v2/projects/${projectId}/content-versions?contentId=nope`,
      token,
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1004');
  });

  it('rejects insufficient scope (403 E1012)', async () => {
    const token = await mint([Capability.BizdataRead]);
    const res = await api(
      'get',
      `/v2/projects/${projectId}/content-versions?contentId=${contentId}`,
      token,
    );
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });
});
