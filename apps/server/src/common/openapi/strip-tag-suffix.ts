import type { OpenAPIObject } from '@nestjs/swagger';

/**
 * Remove a suffix (e.g. `" (v2)"`) from every tag name in an OpenAPI document —
 * both the top-level `tags` list and each operation's `tags`.
 *
 * Controllers tag v2 operations `"<Resource> (v2)"` so the combined `/api`
 * document (v1 + v2) keeps the two API versions in separate groups. The v2-only
 * document the public docs render from doesn't need that disambiguation — its
 * anchor and paths already say v2 — so we strip the suffix there for clean
 * navigation group names. Mutates and returns the document.
 */
export function stripTagSuffix(doc: OpenAPIObject, suffix: string): OpenAPIObject {
  const strip = (name: string) => (name.endsWith(suffix) ? name.slice(0, -suffix.length) : name);

  if (Array.isArray(doc.tags)) {
    for (const tag of doc.tags) {
      if (tag?.name) {
        tag.name = strip(tag.name);
      }
    }
  }
  for (const pathItem of Object.values(doc.paths ?? {})) {
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }
    for (const op of Object.values(pathItem)) {
      const tags = (op as { tags?: unknown })?.tags;
      if (Array.isArray(tags)) {
        (op as { tags: string[] }).tags = tags.map((t) => (typeof t === 'string' ? strip(t) : t));
      }
    }
  }
  return doc;
}
