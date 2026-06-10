import { z } from 'zod';

import { ValidationError } from '@/common/errors/errors';

import { CompileResolvers } from './rules.compile';
import { representationTracker, RepresentationTracker } from './version-data.schema';

/**
 * Compile a representation `data` body back into the internal `version.data`,
 * dispatching on the content type. Validates the payload against the type's
 * schema (→ E1017 on mismatch) and field-level merges onto `existingData` so
 * styling / screenshots / computed sizes / runtime state are preserved.
 *
 * Throws E1017 when the content type does not accept a `data` body (e.g. `flow`,
 * whose body is `steps`).
 */
export function compileVersionData(
  contentType: string,
  data: unknown,
  existingData: unknown,
  resolvers: CompileResolvers,
): unknown {
  switch (contentType) {
    case 'tracker':
      return compileTracker(parse(representationTracker, data), existingData, resolvers);
    default:
      throw new ValidationError(`Content type "${contentType}" does not accept a data body`);
  }
}

/** Validate the representation payload against a type schema, mapping failures to E1017. */
function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid data body');
  }
  return result.data;
}

function compileTracker(
  rep: RepresentationTracker,
  existing: unknown,
  r: CompileResolvers,
): unknown {
  const base = (existing ?? {}) as Record<string, unknown>;
  return { ...base, eventId: rep.event ? r.eventId(rep.event) : null };
}
