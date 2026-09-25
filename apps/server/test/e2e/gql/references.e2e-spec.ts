import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { graphql, gqlData } from '../auth';
import { createTestApp } from '../create-test-app';
import {
  buildAttribute,
  buildContent,
  buildEnvironment,
  buildProject,
  buildSegment,
  buildStep,
  buildTheme,
  buildVersion,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';

/**
 * `listDefinitionReferences` — what a delete dialog shows before the delete is
 * refused (ADR 0016). Same scan as MCP `list_references`; here the locations
 * come back structured, for the web app to word per locale and link.
 */
describe('GraphQL listDefinitionReferences (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let token: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'gql-references' });
    projectId = project.id;
    environmentId = (await buildEnvironment(prisma, { projectId })).id;
    const viewer = await buildAuthorizedUser(prisma, app, { projectId, role: 'VIEWER' });
    token = viewer.token;
    userIds.push(viewer.user.id);
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await teardownProject(prisma, projectId);
      if (userIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }
    await app?.close();
  });

  const listReferences = (kind: string, id: string) =>
    graphql(app, {
      token,
      query: `query ($projectId: String!, $kind: String!, $id: String!) {
        listDefinitionReferences(projectId: $projectId, kind: $kind, id: $id) {
          referrerKind id name contentType segmentBizType
          locations { surface step version }
        }
      }`,
      variables: { projectId, kind, id },
    });

  it('lists content, segment and theme referrers of an attribute with structured locations', async () => {
    const attribute = await buildAttribute(prisma, {
      projectId,
      codeName: 'ref_plan',
      bizType: 1,
      dataType: 2,
    });
    const content = await buildContent(prisma, {
      projectId,
      environmentId,
      type: 'flow',
      name: 'Plan tour',
    });
    const draft = await buildVersion(prisma, {
      contentId: content.id,
      sequence: 0,
      config: { autoStartRules: [{ type: 'user-attr', data: { attrId: attribute.id } }] },
    });
    await buildStep(prisma, {
      versionId: draft.id,
      sequence: 1,
      trigger: [{ conditions: [{ type: 'user-attr', data: { attrId: attribute.id } }] }],
      data: [
        {
          element: { type: 'nps', data: { bindToAttribute: true, selectedAttribute: 'ref_plan' } },
        },
      ],
    });
    const segment = await buildSegment(prisma, {
      projectId,
      environmentId,
      name: 'Plan segment',
      bizType: 2,
      dataType: 2,
      data: [{ type: 'user-attr', data: { attrId: attribute.id } }],
    });
    const theme = await buildTheme(prisma, {
      projectId,
      name: 'Plan theme',
      variations: [{ conditions: [{ type: 'user-attr', data: { attrId: attribute.id } }] }],
    });

    const rows = gqlData(await listReferences('attribute', attribute.id)).listDefinitionReferences;
    const byId = new Map(rows.map((row: { id: string }) => [row.id, row]));

    expect(byId.get(content.id)).toMatchObject({
      referrerKind: 'content',
      name: 'Plan tour',
      contentType: 'flow',
    });
    expect((byId.get(content.id) as { locations: unknown[] }).locations).toEqual(
      expect.arrayContaining([
        { surface: 'startRules', step: null, version: 'draft' },
        { surface: 'stepTrigger', step: 2, version: 'draft' },
        { surface: 'questionBinding', step: 2, version: 'draft' },
      ]),
    );
    expect(byId.get(segment.id)).toMatchObject({
      referrerKind: 'segment',
      name: 'Plan segment',
      segmentBizType: 'company',
      locations: [{ surface: 'segmentConditions', step: null, version: null }],
    });
    expect(byId.get(theme.id)).toMatchObject({
      referrerKind: 'theme',
      locations: [{ surface: 'themeVariations', step: null, version: null }],
    });
  });

  it('answers an empty list for an unreferenced definition', async () => {
    const lonely = await buildAttribute(prisma, { projectId, bizType: 1, dataType: 2 });
    expect(gqlData(await listReferences('attribute', lonely.id)).listDefinitionReferences).toEqual(
      [],
    );
  });

  it('refuses an unknown kind', async () => {
    const attribute = await buildAttribute(prisma, { projectId, bizType: 1, dataType: 2 });
    const res = await listReferences('content', attribute.id);
    expect(res.body.errors?.length).toBeGreaterThan(0);
  });
});
