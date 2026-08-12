import { ValidationError } from '@/common/errors';

import { EventsService } from './events.service';

// Guard: predefined (system) events must never be deleted, enforced at the shared
// domain chokepoint so a raw GraphQL `deleteEvent` (which calls this directly,
// unlike the v2 API layer) can't bypass it.
const makeService = (event: unknown) => {
  const tx = {
    bizEvent: { count: jest.fn().mockResolvedValue(0) },
    attributeOnEvent: { deleteMany: jest.fn().mockResolvedValue({}) },
    event: { delete: jest.fn().mockResolvedValue({ id: 'e1', projectId: 'p1' }) },
  };
  const prisma = {
    event: { findUnique: jest.fn().mockResolvedValue(event) },
    $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
  } as any;
  return { service: new EventsService(prisma), prisma, tx };
};

describe('EventsService.delete — predefined guard', () => {
  it('refuses to delete a predefined event (never reaches the destructive tx)', async () => {
    const { service, prisma } = makeService({ id: 'e1', predefined: true, projectId: 'p1' });
    await expect(service.delete('e1')).rejects.toBeInstanceOf(ValidationError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('deletes a custom (non-predefined) event with no recorded occurrences', async () => {
    const { service, tx } = makeService({ id: 'e1', predefined: false, projectId: 'p1' });
    await service.delete('e1');
    expect(tx.bizEvent.count).toHaveBeenCalledWith({ where: { eventId: 'e1' } });
    expect(tx.event.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
  });
});
