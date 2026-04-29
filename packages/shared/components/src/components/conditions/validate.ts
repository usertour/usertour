import type { Attribute, Content, Event, RulesCondition, Segment } from '@usertour/types';
import type { ValidateContext, ValidationError } from './schema-types';
import { validateConditionByType } from './validators';

// Walks a list of conditions and returns every validation error encountered,
// recursing into both `condition.conditions` (group) and
// `condition.data.whereConditions` (event). Use this from save handlers to
// gate persistence — matches v1 helpers/error.ts `hasError` recursion so
// invalid event-attr / group inside an event's where can't sneak through.
//
// Lives in its own module (not registry-aware) so it stays React-free and
// safe to import from non-React contexts like SDK runtime checks or tests.

export interface ConditionValidationFailure {
  conditionId: string;
  error: ValidationError;
}

export function validateConditions(
  conditions: RulesCondition[],
  ctx: ValidateContext = {},
): ConditionValidationFailure[] {
  const failures: ConditionValidationFailure[] = [];
  for (const condition of conditions) {
    if (condition.type === 'group') {
      failures.push(...validateConditions(condition.conditions ?? [], ctx));
      continue;
    }
    const error = validateConditionByType(condition, ctx);
    if (error) failures.push({ conditionId: condition.id, error });
    // Event carries nested where conditions in its data — recurse so
    // event-attr / group inside the where get validated too. v1's
    // hasError did the same (helpers/error.ts:287).
    if (condition.type === 'event') {
      const where = (condition.data as { whereConditions?: RulesCondition[] } | undefined)
        ?.whereConditions;
      if (where && where.length > 0) {
        failures.push(...validateConditions(where, ctx));
      }
    }
  }
  return failures;
}

// Convenience wrapper accepting individual lookup props directly.
export function validateConditionList(
  conditions: RulesCondition[],
  options: {
    attributes?: Attribute[];
    segments?: Segment[];
    contents?: Content[];
    events?: Event[];
  } = {},
): ConditionValidationFailure[] {
  return validateConditions(conditions, options);
}
