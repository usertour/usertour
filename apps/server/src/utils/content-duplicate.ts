import { cuid, duplicateTarget, duplicateTriggers, isArray } from '@usertour/helpers';
import type { StepTrigger, Step as StepType } from '@usertour/types';

import type { Step } from '@/common/types/schema';

/**
 * Process steps for duplication by removing database-specific fields
 * and regenerating IDs in triggers and target actions
 * @param steps - Array of database steps to process
 * @returns Array of steps ready for creation with regenerated IDs
 */
export const duplicateSteps = (
  steps: Step[],
): Omit<Step, 'id' | 'createdAt' | 'updatedAt' | 'versionId'>[] => {
  if (!isArray(steps)) {
    return [];
  }

  return steps.map(({ id, createdAt, updatedAt, versionId, trigger, target, ...rest }) => ({
    ...rest,
    cvid: cuid(),
    trigger: trigger ? duplicateTriggers(trigger as StepTrigger[]) : trigger,
    target: duplicateTarget(target as StepType['target']),
  }));
};
