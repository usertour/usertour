import { mapContent } from './content.mapper';

/**
 * The mapper is a pure function, so it's testable with a plain fixture object —
 * no NestJS module, no DI, no DB. That's the point of extracting it from the service.
 */
describe('mapContent (pure)', () => {
  const at = new Date('2026-01-01T00:00:00.000Z');
  const base = {
    id: 'c1',
    name: 'Flow',
    type: 'flow',
    editedVersionId: 'v1',
    updatedAt: at,
    createdAt: at,
    contentOnEnvironments: [],
  };

  it('maps base fields with an empty environments[] and no legacy fields', () => {
    expect(mapContent(base, [])).toEqual({
      id: 'c1',
      object: 'content',
      name: 'Flow',
      type: 'flow',
      editedVersionId: 'v1',
      editedVersion: undefined,
      environments: [],
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('maps per-environment publish state (publishedVersion only when expanded)', () => {
    const pubAt = new Date('2026-01-02T00:00:00.000Z');
    const version = { id: 'pv1', sequence: 2, updatedAt: pubAt, createdAt: pubAt };
    const node = {
      ...base,
      contentOnEnvironments: [
        {
          environmentId: 'e1',
          published: true,
          publishedVersionId: 'pv1',
          publishedAt: pubAt,
          publishedVersion: version,
        },
      ],
    };

    expect(mapContent(node, []).environments[0]).toEqual({
      environmentId: 'e1',
      published: true,
      publishedVersionId: 'pv1',
      publishedAt: '2026-01-02T00:00:00.000Z',
      publishedVersion: undefined,
    });

    expect(mapContent(node, ['publishedVersion']).environments[0].publishedVersion).toMatchObject({
      id: 'pv1',
      object: 'contentVersion',
      number: 2,
      questions: [],
    });
  });

  it('inlines editedVersion only when expanded', () => {
    const node = {
      ...base,
      editedVersion: { id: 'v1', sequence: 5, updatedAt: at, createdAt: at },
    };
    expect(mapContent(node, []).editedVersion).toBeUndefined();
    expect(mapContent(node, ['editedVersion']).editedVersion).toMatchObject({
      id: 'v1',
      object: 'contentVersion',
      number: 5,
    });
  });
});
