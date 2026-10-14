import { SERVER_EVALUATED_CONDITION_TYPES } from '@usertour/helpers';

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

// Default set of types the dropdown surfaces when a consumer doesn't pass
// `filterItems`. Mirrors v1 `defaultRulesItems` (rules/index.tsx) exactly so
// callers like ContentDetailAutoStartRules — which never specified
// filterItems — keep their original list and don't get a stray
// task-is-clicked option that v1 hid.
export const DEFAULT_CONDITION_TYPES: string[] = [
  'user-attr',
  'current-page',
  'event',
  'segment',
  'content',
  'element',
  'text-input',
  'text-fill',
  'time',
  'group',
];

// The subset of DEFAULT_CONDITION_TYPES that reactive slots may offer — a step
// trigger's `when`, a button's show/hide/disable rules, a tracker's start
// conditions. Those slots are polled live in the browser, so the
// server-evaluated types (event / segment / content-state) can never fire
// there. Derived from the capability matrix — the same table the server's
// write guards enforce — so the pickers and the API can't drift apart.
export const CLIENT_EVALUABLE_CONDITION_TYPES: string[] = DEFAULT_CONDITION_TYPES.filter(
  (type) => !(SERVER_EVALUATED_CONDITION_TYPES as readonly string[]).includes(type),
);

export function getConditionSchema(type: string): AnySchema | undefined {
  return CONDITION_SCHEMAS.find((s) => s.type === type);
}

// Filter the schemas exposed by the add-condition dropdown. The
// `filterItems` array's order drives display order — consumers like the
// event Where slot pass `['event-attr', 'group']` and want event-attr on
// top; iterating CONDITION_SCHEMAS would silently reimpose registry order
// and contradict that. autostart's `DEFAULT_CONDITION_TYPES` is itself
// already in the desired order, so the default UX is unchanged.
//
// An empty / missing filter means "show every registered, non-hidden
// schema" — which is rarely what a consumer wants; the Conditions
// component normalizes a missing prop to DEFAULT_CONDITION_TYPES before
// reaching here.
export function listAvailableSchemas(filterItems: string[]): AnySchema[] {
  if (!filterItems || filterItems.length === 0) {
    return CONDITION_SCHEMAS.filter((s) => !HIDDEN_FROM_DROPDOWN.has(s.type));
  }
  const byType = new Map(CONDITION_SCHEMAS.map((s) => [s.type, s]));
  return filterItems.map((type) => byType.get(type)).filter((s): s is AnySchema => s !== undefined);
}
