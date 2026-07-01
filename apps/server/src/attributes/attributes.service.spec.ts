import { ValidationError } from '@/common/errors';

import { AttributesService } from './attributes.service';

// Guard: predefined (system) attributes must never be deleted, enforced at the
// shared domain chokepoint so a raw GraphQL `deleteAttribute` (which calls this
// directly, unlike the v2 API layer) can't bypass it.
const makeService = (attr: unknown) => {
  const tx = {
    attributeOnEvent: { deleteMany: jest.fn().mockResolvedValue({}) },
    attribute: { delete: jest.fn().mockResolvedValue({ id: 'a1', projectId: 'p1' }) },
  };
  const prisma = {
    attribute: { findUnique: jest.fn().mockResolvedValue(attr) },
    $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
  } as any;
  const cache = { invalidateDeferred: jest.fn(), keys: { attrs: (p: string) => p } } as any;
  return { service: new AttributesService(prisma, cache), prisma, tx };
};

describe('AttributesService.delete — predefined guard', () => {
  it('refuses to delete a predefined attribute (never reaches the destructive tx)', async () => {
    const { service, prisma } = makeService({ id: 'a1', predefined: true, projectId: 'p1' });
    await expect(service.delete('a1')).rejects.toBeInstanceOf(ValidationError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('deletes a custom (non-predefined) attribute, severing its event links first', async () => {
    const { service, tx } = makeService({ id: 'a1', predefined: false, projectId: 'p1' });
    await service.delete('a1');
    expect(tx.attributeOnEvent.deleteMany).toHaveBeenCalledWith({ where: { attributeId: 'a1' } });
    expect(tx.attribute.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
  });
});
