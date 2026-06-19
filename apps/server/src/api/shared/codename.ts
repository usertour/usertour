import { z } from 'zod';

/**
 * A user-authored `codeName` — the stable identifier of an attribute / event.
 * It doubles as an object key (stored in `BizUser.data`) and a `{{ codeName }}`
 * template reference, so the v2 authoring surface constrains it to a safe
 * identifier: start with a letter, then letters / digits / underscores, 2–20
 * chars — matches the builder's length rule and adds the charset rule the
 * builder lacks. Intentionally stricter than the SDK ingestion path, which stays
 * lenient (it auto-creates attributes from whatever keys an app sends).
 *
 * Use this ONLY for the codeName a write CREATES — never for a codeName that
 * merely REFERENCES an existing attribute/event (those may predate this rule or
 * have been auto-created by the SDK, so references stay plain strings).
 */
export const codeName = z
  .string()
  .min(2)
  .max(20)
  .regex(
    /^[a-zA-Z][a-zA-Z0-9_]*$/,
    'codeName must start with a letter and contain only letters, digits, and underscores',
  );
