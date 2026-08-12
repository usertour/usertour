import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { graphql, gqlData } from '../auth';
import { createTestApp } from '../create-test-app';
import { buildAttribute, buildEvent, buildMembership, buildProject } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';

/**
 * Functional e2e for the `events` GraphQL resolver — follows the themes
 * template: run as an authorized OWNER, assert each mutation's effect in the
 * DB (not just the response), cover key read/error cases. Auth (who-can-call)
 * is covered by permission.e2e-spec; here we run as OWNER.
 */
describe('GraphQL events (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let token: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'gql-events' });
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

  let codeSeq = 0;
  const codeName = (prefix: string) => `${prefix}_${Date.now()}_${codeSeq++}`;

  const createEvent = (
    code: string,
    displayName = 'Event',
    attributeIds: string[] = [],
    description = 'desc',
  ) =>
    graphql(app, {
      token,
      query: `mutation ($data: CreateEventInput!) {
        createEvent(data: $data) {
          id displayName codeName description deleted projectId predefined
        }
      }`,
      variables: {
        data: { displayName, codeName: code, description, projectId, attributeIds },
      },
    });

  describe('createEvent', () => {
    it('creates an event and persists it', async () => {
      const code = codeName('create');
      const event = gqlData(await createEvent(code, 'Signed Up')).createEvent;
      expect(event).toMatchObject({
        displayName: 'Signed Up',
        codeName: code,
        description: 'desc',
        projectId,
        predefined: false,
      });

      const row = await prisma.event.findUnique({ where: { id: event.id } });
      expect(row).toMatchObject({ codeName: code, projectId, displayName: 'Signed Up' });
    });

    it('links the supplied attributes via AttributeOnEvent', async () => {
      const attr = await buildAttribute(prisma, { projectId, bizType: 4 });
      const code = codeName('create-attr');
      const event = gqlData(await createEvent(code, 'With Attr', [attr.id])).createEvent;

      const links = await prisma.attributeOnEvent.findMany({ where: { eventId: event.id } });
      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({ eventId: event.id, attributeId: attr.id });
    });

    it('errors when creating a duplicate codeName in the project', async () => {
      const code = codeName('dup');
      gqlData(await createEvent(code));
      const res = await createEvent(code);
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('updateEvent', () => {
    it('updates fields (echoing the immutable codeName) and persists them', async () => {
      const created = gqlData(await createEvent(codeName('upd'), 'Before')).createEvent;
      const res = await graphql(app, {
        token,
        query: `mutation ($data: UpdateEventInput!) {
          updateEvent(data: $data) { id displayName codeName description }
        }`,
        variables: {
          data: {
            id: created.id,
            displayName: 'After',
            codeName: created.codeName, // echo — edit forms send the current value
            description: 'updated',
            attributeIds: [],
          },
        },
      });
      expect(gqlData(res).updateEvent).toMatchObject({
        id: created.id,
        displayName: 'After',
        codeName: created.codeName,
        description: 'updated',
      });

      const row = await prisma.event.findUnique({ where: { id: created.id } });
      expect(row).toMatchObject({
        displayName: 'After',
        codeName: created.codeName,
        description: 'updated',
      });
    });

    it('REFUSES a codeName rename (immutable — it keys tracked event data)', async () => {
      const created = gqlData(await createEvent(codeName('ren'), 'Before')).createEvent;
      const res = await graphql(app, {
        token,
        query: `mutation ($data: UpdateEventInput!) {
          updateEvent(data: $data) { id codeName }
        }`,
        variables: {
          data: {
            id: created.id,
            displayName: 'After',
            codeName: codeName('ren-new'),
            attributeIds: [],
          },
        },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);

      const row = await prisma.event.findUnique({ where: { id: created.id } });
      expect(row?.codeName).toBe(created.codeName); // untouched
      expect(row?.displayName).toBe('Before'); // refused wholesale, not partially applied
    });

    it('replaces the AttributeOnEvent links', async () => {
      const attrA = await buildAttribute(prisma, { projectId, bizType: 4 });
      const attrB = await buildAttribute(prisma, { projectId, bizType: 4 });
      const created = gqlData(
        await createEvent(codeName('upd-link'), 'Linked', [attrA.id]),
      ).createEvent;

      gqlData(
        await graphql(app, {
          token,
          query: `mutation ($data: UpdateEventInput!) {
            updateEvent(data: $data) { id }
          }`,
          variables: {
            data: {
              id: created.id,
              displayName: 'Linked',
              codeName: created.codeName ?? codeName('upd-link'),
              attributeIds: [attrB.id],
            },
          },
        }),
      );

      const links = await prisma.attributeOnEvent.findMany({ where: { eventId: created.id } });
      expect(links).toHaveLength(1);
      expect(links[0].attributeId).toBe(attrB.id);
    });

    it('errors updating an unknown event', async () => {
      const res = await graphql(app, {
        token,
        query: 'mutation ($data: UpdateEventInput!) { updateEvent(data: $data) { id } }',
        variables: {
          data: {
            id: 'does-not-exist',
            displayName: 'x',
            codeName: codeName('nope'),
            attributeIds: [],
          },
        },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('deleteEvent', () => {
    it('deletes an event and its attribute links', async () => {
      const attr = await buildAttribute(prisma, { projectId, bizType: 4 });
      const created = gqlData(await createEvent(codeName('del'), 'Trash', [attr.id])).createEvent;

      const res = await graphql(app, {
        token,
        query: 'mutation ($data: DeleteEventInput!) { deleteEvent(data: $data) { id } }',
        variables: { data: { id: created.id } },
      });
      expect(gqlData(res).deleteEvent).toMatchObject({ id: created.id });

      const [row, links] = await Promise.all([
        prisma.event.findUnique({ where: { id: created.id } }),
        prisma.attributeOnEvent.findMany({ where: { eventId: created.id } }),
      ]);
      expect(row).toBeNull();
      expect(links).toHaveLength(0);
    });

    it('errors deleting an unknown event', async () => {
      const res = await graphql(app, {
        token,
        query: 'mutation ($data: DeleteEventInput!) { deleteEvent(data: $data) { id } }',
        variables: { data: { id: 'does-not-exist' } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('listEvents', () => {
    it('lists events for the project', async () => {
      const created = gqlData(await createEvent(codeName('list'), 'Listed')).createEvent;
      const res = await graphql(app, {
        token,
        query: 'query ($projectId: String!) { listEvents(projectId: $projectId) { id codeName } }',
        variables: { projectId },
      });
      const ids = gqlData(res).listEvents.map((e: { id: string }) => e.id);
      expect(ids).toContain(created.id);
    });

    it('returns an empty list for a project with no events', async () => {
      const empty = await buildProject(prisma, { name: 'gql-events-empty' });
      // Grant the OWNER access so the permission guard lets the read through.
      await buildMembership(prisma, { userId: userIds[0], projectId: empty.id, role: 'OWNER' });
      const res = await graphql(app, {
        token,
        query: 'query ($projectId: String!) { listEvents(projectId: $projectId) { id } }',
        variables: { projectId: empty.id },
      });
      expect(gqlData(res).listEvents).toEqual([]);
      await teardownProject(prisma, empty.id);
    });
  });

  describe('listAttributeOnEvents', () => {
    it('lists the attribute links for an event', async () => {
      // Seed an Event + an EVENT-scoped Attribute + a join row directly via prisma.
      const event = await buildEvent(prisma, { projectId, codeName: codeName('aoe') });
      const attribute = await buildAttribute(prisma, { projectId, bizType: 4 });
      const link = await prisma.attributeOnEvent.create({
        data: { eventId: event.id, attributeId: attribute.id },
      });

      const res = await graphql(app, {
        token,
        query: `query ($eventId: String!) {
          listAttributeOnEvents(eventId: $eventId) { id eventId attributeId }
        }`,
        variables: { eventId: event.id },
      });
      const links = gqlData(res).listAttributeOnEvents;
      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({
        id: link.id,
        eventId: event.id,
        attributeId: attribute.id,
      });
    });

    it('returns an empty list for an event with no attribute links', async () => {
      const event = await buildEvent(prisma, { projectId, codeName: codeName('aoe-empty') });
      const res = await graphql(app, {
        token,
        query: 'query ($eventId: String!) { listAttributeOnEvents(eventId: $eventId) { id } }',
        variables: { eventId: event.id },
      });
      expect(gqlData(res).listAttributeOnEvents).toEqual([]);
    });
  });
});
