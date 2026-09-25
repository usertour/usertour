import {
  AttributeCodeNameHeldByDeletedError,
  AttributeDefinitionInUseError,
  ValidationError,
} from '@/modules/common/errors/errors';

import { AttributesService } from './attributes.service';

const makeService = (attr: unknown, options: { inUse?: boolean } = {}) => {
  const prisma = {
    attribute: {
      findUnique: jest.fn().mockResolvedValue(attr),
      update: jest.fn(async ({ data }) => ({ ...(attr as object), ...data })),
      create: jest.fn(async ({ data }) => ({ id: 'new', ...data })),
    },
  } as any;
  const cache = { invalidateDeferred: jest.fn(), keys: { attrs: (p: string) => p } } as any;
  const references = {
    assertUnreferenced: jest.fn(async () => {
      if (options.inUse) {
        throw new AttributeDefinitionInUseError();
      }
    }),
  } as any;
  return { service: new AttributesService(prisma, cache, references), prisma, references };
};

// Predefined (system) attributes must never be deleted, enforced at the shared
// domain chokepoint so a raw GraphQL `deleteAttribute` (which calls this
// directly, unlike the v2 API layer) can't bypass it.
describe('AttributesService.delete', () => {
  it('refuses to delete a predefined attribute', async () => {
    const { service, prisma } = makeService({ id: 'a1', predefined: true, projectId: 'p1' });
    await expect(service.delete('a1')).rejects.toBeInstanceOf(ValidationError);
    expect(prisma.attribute.update).not.toHaveBeenCalled();
  });

  it('refuses while a live surface references it (ADR 0016)', async () => {
    const { service, prisma } = makeService(
      { id: 'a1', predefined: false, projectId: 'p1', deleted: false },
      { inUse: true },
    );
    await expect(service.delete('a1')).rejects.toBeInstanceOf(AttributeDefinitionInUseError);
    expect(prisma.attribute.update).not.toHaveBeenCalled();
  });

  it('soft-deletes an unreferenced attribute, keeping the row and its event links', async () => {
    const { service, prisma, references } = makeService({
      id: 'a1',
      predefined: false,
      projectId: 'p1',
      deleted: false,
    });
    await service.delete('a1');
    expect(references.assertUnreferenced).toHaveBeenCalledWith('p1', 'attribute', 'a1');
    expect(prisma.attribute.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { deleted: true },
    });
  });
});

describe('AttributesService.create — restore on create (ADR 0016)', () => {
  const input = {
    projectId: 'p1',
    bizType: 1,
    codeName: 'plan',
    displayName: 'Plan',
    dataType: 2,
  };

  it('restores the deleted attribute holding the codeName instead of creating a new id', async () => {
    const { service, prisma } = makeService({ id: 'a1', ...input, deleted: true });
    const result = await service.create({ ...input, displayName: 'Plan tier' });
    expect(prisma.attribute.create).not.toHaveBeenCalled();
    expect(prisma.attribute.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { deleted: false, displayName: 'Plan tier' },
    });
    expect(result.id).toBe('a1');
  });

  it('refuses when the deleted attribute has another data type', async () => {
    const { service, prisma } = makeService({ id: 'a1', ...input, dataType: 1, deleted: true });
    await expect(service.create(input)).rejects.toBeInstanceOf(AttributeCodeNameHeldByDeletedError);
    expect(prisma.attribute.update).not.toHaveBeenCalled();
  });

  it('creates when no row holds the codeName', async () => {
    const { service, prisma } = makeService(null);
    await service.create(input);
    expect(prisma.attribute.create).toHaveBeenCalledWith({ data: input });
  });
});

describe('AttributesService.restore', () => {
  it('clears the deleted mark', async () => {
    const { service, prisma } = makeService({ id: 'a1', projectId: 'p1', deleted: true });
    await service.restore('a1');
    expect(prisma.attribute.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { deleted: false },
    });
  });

  it('is a no-op on a live attribute', async () => {
    const { service, prisma } = makeService({ id: 'a1', projectId: 'p1', deleted: false });
    await service.restore('a1');
    expect(prisma.attribute.update).not.toHaveBeenCalled();
  });
});
