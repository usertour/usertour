import type { OpenAPIObject } from '@nestjs/swagger';

import { normalizeOpenApiParameters } from './normalize-parameters';

describe('normalizeOpenApiParameters', () => {
  it('moves a union param’s top-level anyOf into schema (the nestjs-zod quirk)', () => {
    const doc = {
      paths: {
        '/v2/x': {
          get: {
            parameters: [
              {
                name: 'orderBy',
                in: 'query',
                required: false,
                description: 'order',
                anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
                schema: {},
              },
            ],
          },
        },
      },
    } as unknown as OpenAPIObject;

    normalizeOpenApiParameters(doc);
    const p = (doc.paths['/v2/x'].get as unknown as { parameters: Record<string, unknown>[] })
      .parameters[0];

    expect(p).not.toHaveProperty('anyOf'); // stray keyword removed from top level
    expect(p.schema).toEqual({
      anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    });
    // allowed parameter keys are untouched
    expect(p).toMatchObject({
      name: 'orderBy',
      in: 'query',
      required: false,
      description: 'order',
    });
  });

  it('leaves a well-formed parameter unchanged', () => {
    const param = { name: 'limit', in: 'query', schema: { type: 'integer' } };
    const doc = {
      paths: { '/v2/x': { get: { parameters: [{ ...param }] } } },
    } as unknown as OpenAPIObject;
    normalizeOpenApiParameters(doc);
    expect((doc.paths['/v2/x'].get as unknown as { parameters: unknown[] }).parameters[0]).toEqual(
      param,
    );
  });

  it('skips $ref parameters and tolerates missing parameters', () => {
    const doc = {
      paths: {
        '/v2/x': { get: { parameters: [{ $ref: '#/components/parameters/Foo' }] }, post: {} },
      },
    } as unknown as OpenAPIObject;
    expect(() => normalizeOpenApiParameters(doc)).not.toThrow();
    expect((doc.paths['/v2/x'].get as unknown as { parameters: unknown[] }).parameters[0]).toEqual({
      $ref: '#/components/parameters/Foo',
    });
  });
});
