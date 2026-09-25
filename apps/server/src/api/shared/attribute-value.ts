import { z } from 'zod';

/**
 * The value side of an attribute write (ADR 0017), shared by the user, company,
 * membership and event bodies. Shape only: whether a value fits its
 * definition's type is judged in the domain (`BizService`), which also owns
 * the meaning of each operation.
 */

const scalar = z.union([z.string(), z.number(), z.boolean()]);
const literal = z.union([scalar, z.array(scalar)]);

export const attributeWriteDataType = z
  .enum(['string', 'number', 'boolean', 'datetime', 'list'])
  .describe(
    'Pins the type of the attribute definition when this write creates it; never retypes an ' +
      'existing definition (a conflicting data_type is rejected).',
  );

const setOperation = z
  .object({ set: literal, data_type: attributeWriteDataType.optional() })
  .strict()
  .describe('Set the value (same as a literal), optionally pinning `data_type`.');
const setOnceOperation = z
  .object({ set_once: literal, data_type: attributeWriteDataType.optional() })
  .strict()
  .describe('Set the value only when the attribute has no value yet.');
const addOperation = z
  .object({ add: z.number() })
  .strict()
  .describe('Add to a Number attribute (negative to subtract); a missing value starts at 0.');
const unionOperation = z
  .object({ union: literal })
  .strict()
  .describe(
    'Append the value(s) not yet present to a List attribute; a missing list starts empty.',
  );
const removeOperation = z
  .object({ remove: literal })
  .strict()
  .describe(
    'Remove every matching value from a List attribute; a missing attribute is left undefined.',
  );

/**
 * `literal | null | { <one operation> }`. Exactly one operation per attribute;
 * `null` removes the attribute.
 */
export const attributeWriteValue = z
  .union([literal, setOperation, setOnceOperation, addOperation, unionOperation, removeOperation])
  .nullable()
  .describe(
    'A literal (string, number, boolean, list of scalars), null to remove the attribute, or ' +
      'exactly one operation object: {set}, {set_once}, {add}, {union}, {remove} — `set` and ' +
      '`set_once` may carry `data_type`.',
  );

/** Events are immutable facts: a literal, null, or `{set, data_type}` only. */
export const eventAttributeWriteValue = z
  .union([literal, setOperation])
  .nullable()
  .describe(
    'A literal (string, number, boolean, list of scalars), null, or {set, data_type} to pin the ' +
      'type of a new event attribute definition.',
  );
