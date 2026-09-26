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
  const queue = { add: jest.fn() } as any;
  return {
    service: new AttributesService(prisma, cache, references, queue),
    prisma,
    references,
    queue,
  };
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

// Random bucketing definitions (ADR 0020 §5): users/companies only, a Random
// number needs its bound, and the type is locked for life. Creation enqueues
// the backfill that materialises the derived values onto existing rows.
describe('AttributesService — random bucketing definitions (ADR 0020)', () => {
  const base = { projectId: 'p1', codeName: 'experiment', displayName: 'Experiment' };

  it('refuses a bucketing attribute on a membership or event scope', async () => {
    const { service } = makeService(null);
    await expect(service.create({ ...base, bizType: 3, dataType: 6 })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(
      service.create({ ...base, bizType: 4, dataType: 7, randomMax: 10 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('requires a valid upper bound for a Random number attribute', async () => {
    const { service } = makeService(null);
    await expect(service.create({ ...base, bizType: 1, dataType: 7 })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(
      service.create({ ...base, bizType: 1, dataType: 7, randomMax: 1 }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      service.create({ ...base, bizType: 1, dataType: 7, randomMax: 10001 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('stores the bound, fixes A/B to 2, drops a bound on other types, and enqueues the backfill', async () => {
    const { service, prisma, queue } = makeService(null);
    await service.create({ ...base, bizType: 1, dataType: 7, randomMax: 100 });
    expect(prisma.attribute.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ dataType: 7, randomMax: 100 }),
    });
    await service.create({ ...base, bizType: 2, dataType: 6, randomMax: 55 });
    expect(prisma.attribute.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ dataType: 6, randomMax: 2 }),
    });
    await service.create({ ...base, bizType: 1, dataType: 2, randomMax: 55 });
    expect(prisma.attribute.create).toHaveBeenLastCalledWith({
      data: expect.not.objectContaining({ randomMax: expect.anything() }),
    });
    expect(queue.add).toHaveBeenCalledTimes(2);
    expect(queue.add).toHaveBeenCalledWith(
      'backfill',
      { attributeId: 'new' },
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it('locks the type of a bucketing attribute, in both directions', async () => {
    const bucketing = makeService({
      id: 'a1',
      codeName: 'experiment',
      source: 'internal',
      dataType: 6,
      bizType: 1,
    });
    await expect(bucketing.service.update({ id: 'a1', dataType: 2 })).rejects.toBeInstanceOf(
      ValidationError,
    );
    const plain = makeService({
      id: 'a2',
      codeName: 'plan',
      source: 'internal',
      dataType: 2,
      bizType: 1,
    });
    await expect(plain.service.update({ id: 'a2', dataType: 7 })).rejects.toBeInstanceOf(
      ValidationError,
    );
    // Labels stay editable.
    await expect(bucketing.service.update({ id: 'a1', displayName: 'Exp' })).resolves.toMatchObject(
      {
        displayName: 'Exp',
      },
    );
  });
});
