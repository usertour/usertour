import type { OpenAPIObject } from '@nestjs/swagger';

/**
 * The keys allowed on an OpenAPI 3.0 Parameter Object. Anything else (anyOf,
 * oneOf, allOf, type, enum, items, …) is a JSON-Schema keyword that must live
 * inside `schema`, not at the parameter top level.
 */
const PARAMETER_KEYS = new Set([
  'name',
  'in',
  'description',
  'required',
  'deprecated',
  'allowEmptyValue',
  'style',
  'explode',
  'allowReserved',
  'schema',
  'example',
  'examples',
  'content',
  '$ref',
]);

function fixParameters(params: unknown): void {
  if (!Array.isArray(params)) {
    return;
  }
  for (const param of params) {
    if (!param || typeof param !== 'object' || '$ref' in param) {
      continue;
    }
    const p = param as Record<string, unknown>;
    const stray = Object.keys(p).filter((k) => !PARAMETER_KEYS.has(k));
    if (stray.length === 0) {
      continue;
    }
    const schema =
      p.schema && typeof p.schema === 'object' ? (p.schema as Record<string, unknown>) : {};
    for (const key of stray) {
      if (!(key in schema)) {
        schema[key] = p[key];
      }
      delete p[key];
    }
    p.schema = schema;
  }
}

/**
 * Normalize OpenAPI parameter objects so the emitted document is valid.
 *
 * nestjs-zod renders a union-typed query param (our `singleOrArray` helper:
 * `z.union([item, z.array(item)])`) as a parameter with `anyOf` at the *top
 * level* and an empty `schema: {}` — which strict OpenAPI validators (Mintlify,
 * swagger-parser) reject. This moves any stray JSON-Schema keywords on every
 * parameter into its `schema`. Mutates and returns the document.
 */
export function normalizeOpenApiParameters(doc: OpenAPIObject): OpenAPIObject {
  for (const pathItem of Object.values(doc.paths ?? {})) {
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }
    // path-level parameters + each operation's parameters
    fixParameters((pathItem as { parameters?: unknown }).parameters);
    for (const op of Object.values(pathItem)) {
      if (op && typeof op === 'object') {
        fixParameters((op as { parameters?: unknown }).parameters);
      }
    }
  }
  return doc;
}
