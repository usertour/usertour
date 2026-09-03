import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { AttributeBizTypes, BizAttributeTypes } from '@usertour/types';
import { initialization } from '@/common/initialization/initialization';
import { EncryptionService } from '@/shared/encryption.service';
import * as hubspotCrmApi from '@/integrations/crm/hubspot-crm-api';

import { graphql, gqlData } from '../auth';
import { buildEnvironment, buildProject, buildSubscription } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';
import { createTestApp } from '../create-test-app';

const LIST_MAPPINGS = `query ($integrationId: String!) {
  listIntegrationObjectMappings(integrationId: $integrationId) {
    id remoteObject localObject matchStrategy matchRemoteField inboundFields outboundFields enabled
  }
}`;
const LIST_REMOTE = `query ($integrationId: String!, $remoteObject: String!) {
  listCrmRemoteProperties(integrationId: $integrationId, remoteObject: $remoteObject) {
    name label type fieldType readOnly hubspotDefined
  }
}`;
const UPSERT = `mutation ($data: UpsertIntegrationObjectMappingInput!) {
  upsertIntegrationObjectMapping(data: $data) {
    id remoteObject localObject matchStrategy matchRemoteField inboundFields outboundFields enabled
  }
}`;
const DELETE = `mutation ($data: IntegrationObjectMappingIdInput!) {
  deleteIntegrationObjectMapping(data: $data)
}`;

const REMOTE_CONTACT_PROPERTIES: hubspotCrmApi.HubspotProperty[] = [
  {
    name: 'email',
    label: 'Email',
    type: 'string',
    fieldType: 'text',
    groupName: 'contactinformation',
    hubspotDefined: true,
  },
  {
    name: 'lifecyclestage',
    label: 'Lifecycle Stage',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'contactinformation',
    hubspotDefined: true,
  },
  {
    name: 'industry',
    label: 'Industry',
    type: 'string',
    fieldType: 'text',
    groupName: 'contactinformation',
    hubspotDefined: true,
  },
  { name: 'seats', label: 'Seats', type: 'number', fieldType: 'number', groupName: 'custom' },
  {
    name: 'app_user_id',
    label: 'App user id',
    type: 'string',
    fieldType: 'text',
    groupName: 'custom',
  },
  {
    name: 'hs_analytics_num_visits',
    label: 'Number of visits',
    type: 'number',
    fieldType: 'number',
    groupName: 'analytics',
    hubspotDefined: true,
    modificationMetadata: { readOnlyValue: true },
  },
];

/**
 * Object mappings over GraphQL (ADR 0013 §4-6): configuration validation and
 * the attribute-ownership bookkeeping. Provider metadata is stubbed at the
 * module boundary; no HubSpot traffic.
 */
describe('GraphQL CRM object mappings (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let integrationId: string;
  let token: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    const project = await buildProject(prisma, { name: 'gql-crm-mapping' });
    projectId = project.id;
    await initialization(prisma, projectId); // predefined attributes (email, name, ...)
    await buildSubscription(prisma, { projectId, planType: 'growth' });
    const environment = await buildEnvironment(prisma, { projectId });
    environmentId = environment.id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    token = owner.token;
    userIds.push(owner.user.id);

    const encryption = app.get(EncryptionService);
    const integration = await prisma.integration.create({
      data: {
        environmentId,
        provider: 'hubspot',
        key: '',
        enabled: true,
        oauthCredentials: encryption.encrypt(
          JSON.stringify({
            accessToken: 'a',
            refreshToken: 'r',
            expiresAt: Date.now() + 3_600_000,
          }),
        ),
        remoteAccountId: '1',
      },
    });
    integrationId = integration.id;
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

  beforeEach(() => {
    jest.spyOn(hubspotCrmApi, 'listHubspotProperties').mockResolvedValue(REMOTE_CONTACT_PROPERTIES);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await prisma.integrationObjectMapping.deleteMany({ where: { integrationId } });
    await prisma.attribute.deleteMany({ where: { projectId, predefined: false } });
  });

  const upsert = (overrides: Record<string, unknown>) =>
    graphql(app, {
      token,
      query: UPSERT,
      variables: {
        data: {
          integrationId,
          remoteObject: 'contact',
          localObject: 'user',
          matchStrategy: 'email',
          inboundFields: [],
          outboundFields: [],
          ...overrides,
        },
      },
    });

  const attribute = (codeName: string) =>
    prisma.attribute.findUnique({
      where: {
        projectId_bizType_codeName: { projectId, bizType: AttributeBizTypes.User, codeName },
      },
    });

  it('lists provider properties with the read-only flag', async () => {
    const res = await graphql(app, {
      token,
      query: LIST_REMOTE,
      variables: { integrationId, remoteObject: 'contact' },
    });
    const rows = gqlData(res).listCrmRemoteProperties;
    expect(rows.map((row: { name: string }) => row.name)).toContain('lifecyclestage');
    expect(
      rows.find((row: { name: string }) => row.name === 'hs_analytics_num_visits').readOnly,
    ).toBe(true);
    expect(rows.find((row: { name: string }) => row.name === 'seats').readOnly).toBe(false);
  });

  it('creates a contact ↔ user mapping: inbound fields become provider-owned attributes, outbound gets remote names', async () => {
    const res = await upsert({
      inboundFields: [
        { remote: 'lifecyclestage', local: 'lifecycle_stage' },
        { remote: 'seats', local: 'seat_count' },
      ],
      outboundFields: [{ local: 'name' }],
    });
    const mapping = gqlData(res).upsertIntegrationObjectMapping;
    expect(mapping).toMatchObject({
      remoteObject: 'contact',
      localObject: 'user',
      matchStrategy: 'email',
      enabled: true,
      outboundFields: [{ local: 'name', remote: 'usertour_user_name' }],
    });
    const stage = await attribute('lifecycle_stage');
    expect(stage).toMatchObject({
      source: 'hubspot',
      sourceId: 'lifecyclestage',
      dataType: BizAttributeTypes.String,
      displayName: 'Lifecycle Stage',
    });
    expect((await attribute('seat_count'))?.dataType).toBe(BizAttributeTypes.Number);

    const list = await graphql(app, { token, query: LIST_MAPPINGS, variables: { integrationId } });
    expect(gqlData(list).listIntegrationObjectMappings).toHaveLength(1);
  });

  it('releases attributes dropped from the inbound list on update', async () => {
    await upsert({ inboundFields: [{ remote: 'lifecyclestage', local: 'lifecycle_stage' }] });
    await upsert({ inboundFields: [{ remote: 'seats', local: 'seat_count' }] });
    expect((await attribute('lifecycle_stage'))?.source).toBe('internal');
    expect((await attribute('seat_count'))?.source).toBe('hubspot');
  });

  it('refuses to take over an existing internal attribute unless adoption is confirmed', async () => {
    await prisma.attribute.create({
      data: {
        projectId,
        bizType: AttributeBizTypes.User,
        codeName: 'industry',
        displayName: 'Industry',
        dataType: BizAttributeTypes.String,
      },
    });
    const refused = await upsert({ inboundFields: [{ remote: 'industry', local: 'industry' }] });
    expect(refused.body.errors?.[0]?.message).toContain('already exists');
    expect((await attribute('industry'))?.source).toBe('internal');

    const adopted = await upsert({
      inboundFields: [{ remote: 'industry', local: 'industry' }],
      adoptExisting: true,
    });
    expect(gqlData(adopted).upsertIntegrationObjectMapping.inboundFields).toEqual([
      { remote: 'industry', local: 'industry' },
    ]);
    expect((await attribute('industry'))?.source).toBe('hubspot');
  });

  it('refuses a data-type mismatch even with adoption', async () => {
    await prisma.attribute.create({
      data: {
        projectId,
        bizType: AttributeBizTypes.User,
        codeName: 'seat_count',
        displayName: 'Seats',
        dataType: BizAttributeTypes.String,
      },
    });
    const res = await upsert({
      inboundFields: [{ remote: 'seats', local: 'seat_count' }],
      adoptExisting: true,
    });
    expect(res.body.errors?.[0]?.message).toContain('different data type');
  });

  it('rejects overlap, unknown provider properties, bad names and provider-owned write-backs', async () => {
    const overlap = await upsert({
      inboundFields: [{ remote: 'industry', local: 'industry' }],
      outboundFields: [{ local: 'industry' }],
    });
    expect(overlap.body.errors?.[0]?.message).toContain('both');

    const unknown = await upsert({ inboundFields: [{ remote: 'nope', local: 'nope' }] });
    expect(unknown.body.errors?.[0]?.message).toContain('does not exist');

    const badName = await upsert({ inboundFields: [{ remote: 'industry', local: '9lives' }] });
    expect(badName.body.errors?.[0]?.message).toContain('Invalid attribute name');

    // Provider-owned by ANOTHER mapping (moving a field from this mapping's own
    // inbound list to its outbound list in one save is a legal hand-over).
    await prisma.attribute.create({
      data: {
        projectId,
        bizType: AttributeBizTypes.User,
        codeName: 'company_stage',
        displayName: 'Company stage',
        dataType: BizAttributeTypes.String,
        source: 'hubspot',
        sourceId: 'lifecyclestage',
      },
    });
    const owned = await upsert({ outboundFields: [{ local: 'company_stage' }] });
    expect(owned.body.errors?.[0]?.message).toContain('owned by hubspot');
  });

  it('requires a remote id field for companies and for remoteField matching', async () => {
    const company = await upsert({
      remoteObject: 'company',
      localObject: 'company',
      matchStrategy: 'email',
    });
    expect(company.body.errors?.[0]?.message).toContain('company id');

    const missing = await upsert({ matchStrategy: 'remoteField' });
    expect(missing.body.errors?.[0]?.message).toContain('holds the Usertour id');

    const ok = await upsert({ matchStrategy: 'remoteField', matchRemoteField: 'app_user_id' });
    expect(gqlData(ok).upsertIntegrationObjectMapping.matchRemoteField).toBe('app_user_id');
  });

  it('deletes a mapping and hands its attributes back', async () => {
    const created = await upsert({
      inboundFields: [{ remote: 'lifecyclestage', local: 'lifecycle_stage' }],
    });
    const id = gqlData(created).upsertIntegrationObjectMapping.id;
    const res = await graphql(app, {
      token,
      query: DELETE,
      variables: { data: { integrationId, id } },
    });
    expect(gqlData(res).deleteIntegrationObjectMapping).toBe(true);
    expect(await prisma.integrationObjectMapping.findUnique({ where: { id } })).toBeNull();
    expect((await attribute('lifecycle_stage'))?.source).toBe('internal');
  });
});
