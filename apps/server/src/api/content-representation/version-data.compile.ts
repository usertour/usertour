import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { ValidationError } from '@/common/errors/errors';

import { compileContent } from './representation.compile';
import { compileActions, compileConditions, CompileResolvers } from './rules.compile';
import {
  representationChecklist,
  RepresentationChecklist,
  representationTracker,
  RepresentationTracker,
} from './version-data.schema';

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
    case 'checklist':
      return compileChecklist(parse(representationChecklist, data), existingData, resolvers);
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

function compileChecklist(
  rep: RepresentationChecklist,
  existing: unknown,
  r: CompileResolvers,
): unknown {
  const base = (existing ?? {}) as Record<string, any>;
  const out: Record<string, any> = { ...base };
  if (rep.buttonText !== undefined) out.buttonText = rep.buttonText;
  if (rep.initialDisplay !== undefined) out.initialDisplay = rep.initialDisplay;
  if (rep.completionOrder !== undefined) out.completionOrder = rep.completionOrder;
  if (rep.preventDismiss !== undefined) out.preventDismissChecklist = rep.preventDismiss;
  if (rep.autoDismiss !== undefined) out.autoDismissChecklist = rep.autoDismiss;
  if (rep.content !== undefined) out.content = compileContent(rep.content, base.content, r);

  if (rep.items !== undefined) {
    const prevById = new Map(
      (Array.isArray(base.items) ? base.items : []).map((it: any) => [it.id, it]),
    );
    out.items = rep.items.map((it) => {
      const prev = it.id ? prevById.get(it.id) : undefined;
      const onlyShowTask = it.onlyShowWhen !== undefined;
      return {
        ...(prev ?? {}),
        id: it.id ?? randomUUID(),
        name: it.name,
        ...(it.description !== undefined ? { description: it.description } : {}),
        isCompleted: prev?.isCompleted ?? false,
        completeConditions: compileConditions(it.completeWhen ?? [], r),
        clickedActions: compileActions(it.clickActions ?? []),
        onlyShowTask,
        onlyShowTaskConditions: onlyShowTask ? compileConditions(it.onlyShowWhen ?? [], r) : [],
      };
    });
  }
  return out;
}
