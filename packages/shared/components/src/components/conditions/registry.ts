import type { AnySchema } from './schema-types';
import { contentSchema } from './types/content';
import { currentPageSchema } from './types/current-page';
import { elementSchema } from './types/element';
import { eventSchema } from './types/event';
import { eventAttrSchema } from './types/event-attr';
import { groupSchema } from './types/group';
import { segmentSchema } from './types/segment';
import { taskClickedSchema } from './types/task-clicked';
import { textFillSchema } from './types/text-fill';
import { textInputSchema } from './types/text-input';
import { timeSchema } from './types/time';
import { userAttrSchema } from './types/user-attr';

// Registered condition types. Order here defines the order shown in the
// add-condition dropdown when no `filterItems` is given.
export const CONDITION_SCHEMAS: AnySchema[] = [
  userAttrSchema as AnySchema,
  currentPageSchema as AnySchema,
  eventSchema as AnySchema,
  segmentSchema as AnySchema,
  contentSchema as AnySchema,
  taskClickedSchema as AnySchema,
  elementSchema as AnySchema,
  textInputSchema as AnySchema,
  textFillSchema as AnySchema,
  timeSchema as AnySchema,
  groupSchema as AnySchema,
];

// `event-attr` is registered but lives only inside the event editor's
// `whereConditions` slot — the add-condition dropdown should not surface it
// at the top level. Keeping it in the schema set so getConditionSchema()
// resolves it and ConditionRow knows how to render unknown 'event-attr' rows
// in case they appear standalone (legacy data).
const HIDDEN_FROM_DROPDOWN = new Set(['event-attr']);

CONDITION_SCHEMAS.push(eventAttrSchema as AnySchema);

export function getConditionSchema(type: string): AnySchema | undefined {
  return CONDITION_SCHEMAS.find((s) => s.type === type);
}

// Filter the schemas exposed by the add-condition dropdown. When `filterItems`
// is empty, all registered schemas (minus internal ones) are available;
// otherwise only the listed types show up.
export function listAvailableSchemas(filterItems: string[]): AnySchema[] {
  if (!filterItems || filterItems.length === 0) {
    return CONDITION_SCHEMAS.filter((s) => !HIDDEN_FROM_DROPDOWN.has(s.type));
  }
  return CONDITION_SCHEMAS.filter((s) => filterItems.includes(s.type));
}
