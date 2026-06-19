import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { graphql, gqlData } from '../auth';
import { createTestApp } from '../create-test-app';
import { buildProject } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';

/**
 * Functional e2e for the `attributes` GraphQL resolver — follows the themes
 * template: run as an authorized OWNER, assert each mutation's effect in the DB
 * (not just the response), and cover key read/error cases. Auth (who-can-call)
 * is already covered by permission.e2e-spec; here we run as OWNER.
 *
 * bizType is an int enum: 1=USER, 2=COMPANY, 3=COMPANY_MEMBERSHIP, 4=EVENT.
 * dataType is an int enum (1=Number, 2=String, ...). Both are `Int!` inputs.
 */
describe('GraphQL attributes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let token: string;
  const userIds: string[] = [];

  const BIZ_USER = 1;
  const BIZ_COMPANY = 2;
  const DATA_STRING = 2;
  const DATA_NUMBER = 1;

  let codeNameSeq = 0;
  const uniqueCodeName = (prefix = 'attr') => `${prefix}_${Date.now()}_${codeNameSeq++}`;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'gql-attributes' });
    projectId = project.id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    token = owner.token;
    userIds.push(owner.user.id);
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

  const createAttribute = (
    overrides: {
      displayName?: string;
      codeName?: string;
      description?: string;
      bizType?: number;
      dataType?: number;
    } = {},
  ) =>
    graphql(app, {
      token,
      query: `mutation ($data: CreateAttributeInput!) {
        createAttribute(data: $data) {
          id bizType projectId displayName codeName description dataType predefined
        }
      }`,
      variables: {
        data: {
          projectId,
          displayName: overrides.displayName ?? 'Display Name',
          codeName: overrides.codeName ?? uniqueCodeName(),
          description: overrides.description ?? 'a description',
          bizType: overrides.bizType ?? BIZ_USER,
          dataType: overrides.dataType ?? DATA_STRING,
        },
      },
    });

  describe('createAttribute', () => {
    it('creates an attribute and persists it', async () => {
      const codeName = uniqueCodeName('create');
      const attr = gqlData(
        await createAttribute({
          displayName: 'First Name',
          codeName,
          description: 'the first name',
          bizType: BIZ_USER,
          dataType: DATA_STRING,
        }),
      ).createAttribute;

      expect(attr).toMatchObject({
        displayName: 'First Name',
        codeName,
        description: 'the first name',
        bizType: BIZ_USER,
        dataType: DATA_STRING,
        projectId,
        predefined: false,
      });

      const row = await prisma.attribute.findUnique({ where: { id: attr.id } });
      expect(row).toMatchObject({
        displayName: 'First Name',
        codeName,
        bizType: BIZ_USER,
        dataType: DATA_STRING,
        projectId,
      });
    });

    it('errors creating a duplicate (projectId, bizType, codeName)', async () => {
      const codeName = uniqueCodeName('dup');
      gqlData(await createAttribute({ codeName, bizType: BIZ_USER }));

      const res = await createAttribute({ codeName, bizType: BIZ_USER });
      expect(res.body.errors?.length).toBeGreaterThan(0);

      // Confirm no second row leaked in.
      const rows = await prisma.attribute.findMany({
        where: { projectId, bizType: BIZ_USER, codeName },
      });
      expect(rows).toHaveLength(1);
    });
  });

  describe('updateAttribute', () => {
    it('updates fields and persists them', async () => {
      const created = gqlData(
        await createAttribute({ displayName: 'Before', dataType: DATA_STRING }),
      ).createAttribute;

      const res = await graphql(app, {
        token,
        query: `mutation ($data: UpdateAttributeInput!) {
          updateAttribute(data: $data) { id displayName dataType }
        }`,
        variables: {
          data: { id: created.id, displayName: 'After', dataType: DATA_NUMBER },
        },
      });
      expect(gqlData(res).updateAttribute).toMatchObject({
        id: created.id,
        displayName: 'After',
        dataType: DATA_NUMBER,
      });

      const row = await prisma.attribute.findUnique({ where: { id: created.id } });
      expect(row).toMatchObject({ displayName: 'After', dataType: DATA_NUMBER });
    });

    it('ignores codeName on update (immutable after creation)', async () => {
      const original = uniqueCodeName('immutable');
      const created = gqlData(await createAttribute({ codeName: original })).createAttribute;

      // A direct GraphQL mutation passes a changed codeName — the domain must
      // drop it (codeName keys BizUser.data; renaming would orphan that data).
      await graphql(app, {
        token,
        query: `mutation ($data: UpdateAttributeInput!) {
          updateAttribute(data: $data) { id codeName }
        }`,
        variables: { data: { id: created.id, codeName: `${original}_renamed`, displayName: 'X' } },
      });

      const row = await prisma.attribute.findUnique({ where: { id: created.id } });
      expect(row?.codeName).toBe(original); // unchanged despite the request
      expect(row?.displayName).toBe('X'); // other fields still update
    });

    it('errors updating an unknown attribute', async () => {
      const res = await graphql(app, {
        token,
        query: `mutation ($data: UpdateAttributeInput!) {
          updateAttribute(data: $data) { id }
        }`,
        variables: { data: { id: 'does-not-exist', displayName: 'x' } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('deleteAttribute', () => {
    it('hard-deletes the attribute row', async () => {
      const created = gqlData(await createAttribute({ displayName: 'Trash' })).createAttribute;

      const res = await graphql(app, {
        token,
        query: `mutation ($data: DeleteAttributeInput!) {
          deleteAttribute(data: $data) { id }
        }`,
        variables: { data: { id: created.id } },
      });
      expect(gqlData(res).deleteAttribute).toMatchObject({ id: created.id });

      const row = await prisma.attribute.findUnique({ where: { id: created.id } });
      expect(row).toBeNull();
    });

    it('errors deleting an unknown attribute', async () => {
      const res = await graphql(app, {
        token,
        query: `mutation ($data: DeleteAttributeInput!) {
          deleteAttribute(data: $data) { id }
        }`,
        variables: { data: { id: 'does-not-exist' } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('listAttributes', () => {
    it('lists attributes filtered by bizType', async () => {
      const userAttr = gqlData(
        await createAttribute({ displayName: 'User Attr', bizType: BIZ_USER }),
      ).createAttribute;
      const companyAttr = gqlData(
        await createAttribute({ displayName: 'Company Attr', bizType: BIZ_COMPANY }),
      ).createAttribute;

      const res = await graphql(app, {
        token,
        query: `query ($projectId: String!, $bizType: Int!) {
          listAttributes(projectId: $projectId, bizType: $bizType) {
            id bizType projectId
          }
        }`,
        variables: { projectId, bizType: BIZ_USER },
      });
      const list = gqlData(res).listAttributes as Array<{ id: string; bizType: number }>;
      const ids = list.map((a) => a.id);
      expect(ids).toContain(userAttr.id);
      expect(ids).not.toContain(companyAttr.id);
      expect(list.every((a) => a.bizType === BIZ_USER)).toBe(true);
    });

    it('returns all project attributes when bizType is 0', async () => {
      const userAttr = gqlData(
        await createAttribute({ displayName: 'Any User', bizType: BIZ_USER }),
      ).createAttribute;
      const companyAttr = gqlData(
        await createAttribute({ displayName: 'Any Company', bizType: BIZ_COMPANY }),
      ).createAttribute;

      const res = await graphql(app, {
        token,
        query: `query ($projectId: String!, $bizType: Int!) {
          listAttributes(projectId: $projectId, bizType: $bizType) { id }
        }`,
        variables: { projectId, bizType: 0 },
      });
      const ids = (gqlData(res).listAttributes as Array<{ id: string }>).map((a) => a.id);
      expect(ids).toContain(userAttr.id);
      expect(ids).toContain(companyAttr.id);
    });

    it('returns an empty list for a bizType with no matching attributes', async () => {
      // This suite never creates EVENT (bizType 4) attributes in the project,
      // so the filtered list is empty.
      const res = await graphql(app, {
        token,
        query: `query ($projectId: String!, $bizType: Int!) {
          listAttributes(projectId: $projectId, bizType: $bizType) { id }
        }`,
        variables: { projectId, bizType: 4 },
      });
      expect(gqlData(res).listAttributes).toEqual([]);
    });
  });
});
