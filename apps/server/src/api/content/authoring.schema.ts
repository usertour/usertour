import { z } from 'zod';

import { ApiObjectType } from '../shared/object-type';

/**
 * The authoring/representation schema — a stable, intent-level view of a step
 * that the decompiler produces from the internal `ContentEditorRoot[]` + step
 * fields, and (later) the compiler consumes for writes. See AUTHORING_SCHEMA.md.
 *
 * Phase 1: the slim step (identity + type + order). Phase 2 grows this with
 * `target` / `placement` / `content` blocks / `triggers`.
 */
export const authoringStep = z.object({
  object: z.literal(ApiObjectType.STEP),
  id: z.string(),
  /** Front-end logical id — the write upsert key. Round-trips on read. */
  cvid: z.string().nullable(),
  name: z.string(),
  /** tooltip | modal | bubble | hidden */
  type: z.string(),
  sequence: z.number(),
});
export type AuthoringStep = z.infer<typeof authoringStep>;
