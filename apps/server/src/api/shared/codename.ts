import { z } from 'zod';

/**
 * A user-authored `codeName` — the stable identifier of an attribute / event.
 * It doubles as an object key (stored in `BizUser.data`) and a `{{ codeName }}`
 * template reference, so the v2 authoring surface constrains it to a safe
 * identifier: start with a letter, then letters / digits / underscores, 2–100
 * chars. The cap was 20 (copied from the builder's form rule), which the
 * product's own built-in names violate — `resource_center_version_number` is
 * 30, and 26 of the built-in attribute/event codeNames exceed 20 — so v2
 * could neither create names in the house style nor set values for those
 * attributes on upsert (the record KEYS carry this rule too). Length has no
 * technical backing (JSONB key + template token, neither cares); the charset
 * rule is the load-bearing half and stays. Still intentionally stricter than
 * the SDK ingestion path, which auto-creates attributes from whatever keys an
 * app sends — an SDK-created key outside this charset (dots, dashes) remains
 * writable only through the SDK.
 *
 * Use this ONLY for the codeName a write CREATES — never for a codeName that
 * merely REFERENCES an existing attribute/event (those may predate this rule or
 * have been auto-created by the SDK, so references stay plain strings).
 */
export const codeName = z
  .string()
  .min(2)
  .max(100)
  .regex(
    /^[a-zA-Z][a-zA-Z0-9_]*$/,
    'codeName must start with a letter and contain only letters, digits, and underscores',
  );
