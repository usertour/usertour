import type { RulesCondition } from '@usertour/types';
import { getActionSchema } from './registry';
import type { ValidateContext, ValidationError } from './schema-types';

export interface ActionValidationFailure {
  id?: string;
  type: string;
  error: ValidationError;
}

// Walks the action list and runs each schema's validate(). Returns a flat
// list of failures so the caller can both gate Save and surface a count to
// the user. Mirrors validateConditions in shared-components/conditions.
export function validateActions(
  conditions: RulesCondition[],
  ctx: ValidateContext,
): ActionValidationFailure[] {
  const failures: ActionValidationFailure[] = [];
  for (const condition of conditions) {
    const schema = getActionSchema(condition.type);
    if (!schema?.validate) continue;
    const error = schema.validate(condition, ctx);
    if (error) {
      failures.push({ id: condition.id, type: condition.type, error });
    }
  }
  return failures;
}
