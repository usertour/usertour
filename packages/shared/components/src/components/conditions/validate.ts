import type { Attribute, Content, Event, RulesCondition, Segment } from '@usertour/types';
import { getConditionSchema } from './registry';
import type { ValidateContext, ValidationError } from './schema-types';

// Walks a list of conditions (recursing into 'group' types) and returns the
// first validation error encountered, or undefined if everything is valid.
// Use this from save handlers to gate persistence.

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
    const schema = getConditionSchema(condition.type);
    if (!schema) continue;
    const error = schema.validate?.(condition, ctx);
    if (error) failures.push({ conditionId: condition.id, error });
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
