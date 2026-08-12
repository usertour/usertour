import { mapVersion } from '../content-versions/content-versions.mapper';
import { mapContent } from './content.mapper';

/**
 * The mapper is a pure function, so it's testable with a plain fixture object —
 * no NestJS module, no DI, no DB. That's the point of extracting it from the service.
 *
 * The inline-version mapper passed here is the REAL standalone `mapVersion`
 * (what the service wires in, minus the rules decompile), pinning the audit
 * contract: an inline version carries the standalone shape — `firstPublishedAt`
 * always present, `questions: null` (not `[]`) when not requested.
 */
describe('mapContent (pure)', () => {
  const at = new Date('2026-01-01T00:00:00.000Z');
  const inlineVersion = (v: any) => mapVersion(v, null);
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
    expect(mapContent(base, [], inlineVersion)).toEqual({
      id: 'c1',
      object: 'content',
      name: 'Flow',
      type: 'flow',
      buildUrl: null,
      editedVersionId: 'v1',
      editedVersion: undefined,
      deleted: false,
      environments: [],
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('maps per-environment publish state (publishedVersion only when expanded)', () => {
    const pubAt = new Date('2026-01-02T00:00:00.000Z');
    const version = {
      id: 'pv1',
      sequence: 2,
      publishedAt: pubAt,
      themeId: null,
      updatedAt: pubAt,
      createdAt: pubAt,
    };
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

    expect(mapContent(node, [], inlineVersion).environments[0]).toEqual({
      environmentId: 'e1',
      published: true,
      publishedVersionId: 'pv1',
      publishedAt: '2026-01-02T00:00:00.000Z',
      publishedVersion: undefined,
    });

    // A published version inlines with its freeze stamp — the once-missing field.
    expect(
      mapContent(node, ['publishedVersion'], inlineVersion).environments[0].publishedVersion,
    ).toMatchObject({
      id: 'pv1',
      object: 'contentVersion',
      number: 2,
      firstPublishedAt: '2026-01-02T00:00:00.000Z',
      questions: null,
    });
  });

  it('inlines editedVersion only when expanded, in the standalone shape', () => {
    const node = {
      ...base,
      editedVersion: {
        id: 'v1',
        sequence: 5,
        publishedAt: null,
        themeId: null,
        updatedAt: at,
        createdAt: at,
      },
    };
    expect(mapContent(node, [], inlineVersion).editedVersion).toBeUndefined();
    const inlined = mapContent(node, ['editedVersion'], inlineVersion).editedVersion;
    expect(inlined).toMatchObject({
      id: 'v1',
      object: 'contentVersion',
      number: 5,
      // Never-published draft: the stamp is present-and-null, never absent.
      firstPublishedAt: null,
      // null = "not requested" — the standalone endpoint's meaning. [] would
      // falsely read as "requested, and there are none".
      questions: null,
    });
  });
});
