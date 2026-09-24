import { EventDefinitionInUseError, ValidationError } from '@/modules/common/errors/errors';

import { EventsService } from './events.service';

const makeService = (event: unknown, options: { inUse?: boolean } = {}) => {
  const tx = {
    event: { update: jest.fn(async ({ data }) => ({ ...(event as object), ...data })) },
    attributeOnEvent: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
  };
  const prisma = {
    event: {
      findUnique: jest.fn().mockResolvedValue(event),
      update: jest.fn(async ({ data }) => ({ ...(event as object), ...data })),
    },
    $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
  } as any;
  const references = {
    assertUnreferenced: jest.fn(async () => {
      if (options.inUse) {
        throw new EventDefinitionInUseError();
      }
    }),
  } as any;
  return { service: new EventsService(prisma, references), prisma, tx, references };
};

// Predefined (system) events must never be deleted, enforced at the shared
// domain chokepoint so a raw GraphQL `deleteEvent` (which calls this directly,
// unlike the v2 API layer) can't bypass it.
describe('EventsService.delete', () => {
  it('refuses to delete a predefined event', async () => {
    const { service, prisma } = makeService({ id: 'e1', predefined: true, projectId: 'p1' });
    await expect(service.delete('e1')).rejects.toBeInstanceOf(ValidationError);
    expect(prisma.event.update).not.toHaveBeenCalled();
  });

  it('refuses while a live surface references it (ADR 0016)', async () => {
    const { service, prisma } = makeService(
      { id: 'e1', predefined: false, projectId: 'p1', deleted: false },
      { inUse: true },
    );
    await expect(service.delete('e1')).rejects.toBeInstanceOf(EventDefinitionInUseError);
    expect(prisma.event.update).not.toHaveBeenCalled();
  });

  it('soft-deletes an unreferenced event, whatever it has recorded', async () => {
    const { service, prisma, references } = makeService({
      id: 'e1',
      predefined: false,
      projectId: 'p1',
      deleted: false,
    });
    await service.delete('e1');
    expect(references.assertUnreferenced).toHaveBeenCalledWith('p1', 'event', 'e1');
    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { deleted: true },
    });
  });
});

describe('EventsService.create — restore on create (ADR 0016)', () => {
  it('restores the deleted event holding the codeName and links the new attributes', async () => {
    const { service, tx } = makeService({
      id: 'e1',
      projectId: 'p1',
      codeName: 'signed_up',
      deleted: true,
    });
    const result = await service.create({
      projectId: 'p1',
      codeName: 'signed_up',
      displayName: 'Signed up',
      attributeIds: ['a1'],
    });
    expect(tx.event.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { deleted: false, displayName: 'Signed up' },
    });
    expect(tx.attributeOnEvent.createMany).toHaveBeenCalledWith({
      data: [{ attributeId: 'a1', eventId: 'e1' }],
      skipDuplicates: true,
    });
    expect(result.id).toBe('e1');
  });
});

describe('EventsService.restore', () => {
  it('clears the deleted mark', async () => {
    const { service, prisma } = makeService({ id: 'e1', projectId: 'p1', deleted: true });
    await service.restore('e1');
    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { deleted: false },
    });
  });

  it('is a no-op on a live event', async () => {
    const { service, prisma } = makeService({ id: 'e1', projectId: 'p1', deleted: false });
    await service.restore('e1');
    expect(prisma.event.update).not.toHaveBeenCalled();
  });
});
