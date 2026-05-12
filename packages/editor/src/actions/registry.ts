import { ContentActionsItemType } from '@usertour/types';
import type { AnySchema } from './schema-types';

// Schemas register themselves at module-load time via `registerActionSchema`.
// We avoid a static import list here so Stage 18A can compile with no
// registered types and later stages append schemas without touching this
// file. Order matters: it drives the order in the add-action dropdown when
// no `filterItems` is given.
export const ACTION_SCHEMAS: AnySchema[] = [];

export function registerActionSchema(schema: AnySchema): void {
  if (ACTION_SCHEMAS.some((registered) => registered.type === schema.type)) {
    return;
  }
  ACTION_SCHEMAS.push(schema);
}

// Default set of types the dropdown surfaces when a consumer doesn't pass
// `filterItems`. Matches v1 actions-group.tsx behavior: launcher / checklist
// / banner dismiss variants are surfaced only when the consumer explicitly
// asks for them via filterItems (their respective container builders).
export const DEFAULT_ACTION_TYPES: string[] = [
  ContentActionsItemType.STEP_GOTO,
  ContentActionsItemType.FLOW_DISMIS,
  ContentActionsItemType.FLOW_START,
  ContentActionsItemType.PAGE_NAVIGATE,
  ContentActionsItemType.JAVASCRIPT_EVALUATE,
];

export function getActionSchema(type: string): AnySchema | undefined {
  return ACTION_SCHEMAS.find((schema) => schema.type === type);
}

// Filter the schemas exposed by the add-action dropdown. `filterItems` order
// drives display order — consumers like the launcher behavior panel that
// pass `[LAUNCHER_DISMIS, PAGE_NAVIGATE, JAVASCRIPT_EVALUATE]` want their
// own order honored. An empty / missing filter means "show the default set"
// — the Actions root normalizes a missing prop to DEFAULT_ACTION_TYPES.
export function listAvailableSchemas(filterItems: string[]): AnySchema[] {
  if (!filterItems || filterItems.length === 0) {
    return ACTION_SCHEMAS.filter((schema) => DEFAULT_ACTION_TYPES.includes(schema.type));
  }
  const byType = new Map(ACTION_SCHEMAS.map((schema) => [schema.type, schema]));
  return filterItems
    .map((type) => byType.get(type))
    .filter((schema): schema is AnySchema => schema !== undefined);
}
